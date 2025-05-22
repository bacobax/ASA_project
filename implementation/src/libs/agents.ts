import { BeliefBase } from "./beliefs";
import { DesireGenerator } from "./desire";
import { IntentionManager } from "./intentions";
import { planFor, createPlanExecutor } from "./planner";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { floydWarshallWithPaths } from "./utils/pathfinding";
import { getCenterDirectionTilePosition, getNearestDeliverySpot } from "./utils/desireUtils";
import {
    MapConfig, Position, atomicActions, AgentLog, Intention,
    desireType, Agent,
    Parcel
} from "../types/types";
import {
    EXPLORATION_STEP_TOWARDS_CENTER, MAX_BLOCK_RETRIES, WAIT_FOR_AGENT_MOVE_ON
} from "../config";
import { getConfig, sanitizeConfigs, Strategies, writeConfigs } from "./utils/common";
import { resetBeliefsCollaboration, sendAvailabilityMessage } from "./utils/commumications";

export class AgentBDI {
    private api: DeliverooApi;
    private beliefs: BeliefBase = new BeliefBase();
    private desires = new DesireGenerator();
    private intentions = new IntentionManager();
    private currentPlan: atomicActions[] = [];
    private atomicActionToApi = new Map<atomicActions, (api: DeliverooApi) => Promise<any>>();
    private isPlanRunning = false;
    private planAbortSignal = false;

    private startSemaphore = {
        onYou: false,
        onMap: false,
        onConfig: false,
    }

    constructor(api: DeliverooApi, strategy: Strategies, teamId: string, teammatesIds: string[]) {
        this.beliefs.updateBelief("teamId", teamId);
        this.beliefs.updateBelief("teammatesIds", teammatesIds);

        this.api = api;
        this.beliefs.updateBelief("strategy", strategy);
        console.log(`Strategy: ${strategy}`)
        this.initActionHandlers();
        this.setupSocketHandlers();
    }

    private initActionHandlers(): void {
        this.atomicActionToApi.set(atomicActions.moveRight, api => api.move("right"));
        this.atomicActionToApi.set(atomicActions.moveLeft, api => api.move("left"));
        this.atomicActionToApi.set(atomicActions.moveUp, api => api.move("up"));
        this.atomicActionToApi.set(atomicActions.moveDown, api => api.move("down"));
        this.atomicActionToApi.set(atomicActions.pickup, api => api.pickup());
        this.atomicActionToApi.set(atomicActions.drop, api => api.putdown());
        this.atomicActionToApi.set(atomicActions.wait, async _ => {
            await new Promise(res => setTimeout(res, 1000));
            return true;
        });
    }
    public play(): void{
        const movementDuration = getConfig<number>("MOVEMENT_DURATION")!;
        if(!this.startSemaphore.onYou || !this.startSemaphore.onMap || !this.startSemaphore.onConfig){
            setTimeout(() => this.play(), 1000);
            return;
        }
        console.log("I am ", this.beliefs.getBelief<string>("id"));
        console.log("My teammates are ", this.beliefs.getBelief<string[]>("teammatesIds"));
        console.log("My team is ", this.beliefs.getBelief<string>("teamId"));

        setInterval(() => this.deliberate().catch(console.error), movementDuration*2);
    }
    private setupSocketHandlers(): void {

        this.api.onMsg(async (id, name, msg, _reply) => {
            if (!this.beliefs.getBelief<string[]>("teammatesIds")?.includes(id)) {
                return;
            }

            const message = JSON.parse(msg) as { type: string; data: any };

            if (message.type === 'available_to_help') {
                // A receives help availability message from B
            if (this.intentions.getCurrentIntention()?.type !== desireType.MOVE && !this.beliefs.getBelief("isCollaborating")) {
                const midpoint = getNearestDeliverySpot({startPosition:this.beliefs.getBelief<Position>("position") as Position, beliefs:this.beliefs});
                await this.stopCurrentPlan();
                this.api.say(id, JSON.stringify({
                    type: 'help_here',
                    data: {
                        midpoint: midpoint
                    }
                }));
                this.beliefs.updateBelief("isCollaborating", true);
                this.beliefs.updateBelief("midpoint", midpoint);
                this.beliefs.updateBelief("role", "explorer");
            }
            } else if (message.type === 'help_here') {
                // B receives help acceptance message from A with midpoint
                if (this.intentions.getCurrentIntention()?.type === desireType.MOVE) {
                    await this.stopCurrentPlan();
                    this.beliefs.updateBelief("isCollaborating", true);
                    this.beliefs.updateBelief("midpoint", message.data.midpoint);
                    this.beliefs.updateBelief("role", "courier");
                } else {
                    sendAvailabilityMessage(this.beliefs, this.api, false);
                }
            } else if (message.type === 'not_available_to_help') {
                // Teammate is no longer available to help
                resetBeliefsCollaboration(this.beliefs);
            }
        });

        this.api.onYou(data => {
            const position = { x: Math.round(data.x), y: Math.round(data.y) };
            this.beliefs.updateBelief("position", position);
            let lastVisited = this.beliefs.getBelief<number[][]>("lastVisited");
            if (!lastVisited) {
                const map = this.beliefs.getBelief<MapConfig>("map");
                if (map){
                    let lastVisitedNew : number[][] = new Array(map.width).fill(-Infinity).map(() => new Array(map.height).fill(-Infinity));
                    lastVisitedNew[position.x][position.y] = Date.now(); 
                    this.beliefs.updateBelief("lastVisited", lastVisitedNew); 
                }
            } else {
                lastVisited[position.x][position.y] = Date.now();
                this.beliefs.updateBelief("lastVisited", lastVisited);
            }
            
            this.beliefs.updateBelief("id", data.id);
            this.beliefs.updateBelief("score", data.score);
            this.startSemaphore.onYou = true;
        });

        this.api.onParcelsSensing(parcels => {
            this.beliefs.updateBelief("visibleParcels", parcels);
            this.intentions.reviseIntentions(this.beliefs);
        });

        this.api.onAgentsSensing(agents => {
            this.beliefs.updateBelief("agents", agents);
            const timestamp = Date.now();
            for (const agent of agents) {
                const logs: AgentLog[] = this.beliefs.getBelief(agent.id) ?? [];
                logs.push({ prevPosition: { x: agent.x, y: agent.y }, timestamp });
                this.beliefs.updateBelief(agent.id, logs);
            }
        });

        this.api.onMap((width, height, tiles) => {
            const validTiles = tiles.filter(t => t.type !== 0);
            
            let mapTypes = new Array(width).fill(0).map(() => new Array(height).fill(0));
            for (const tile of validTiles) {
                mapTypes[tile.x][tile.y] = tile.type;
            }

            const map: MapConfig = { width, height, tiles: validTiles };
            this.beliefs.updateBelief("map", map);
            this.beliefs.updateBelief("mapTypes", mapTypes);
            this.beliefs.updateBelief("deliveries", tiles.filter(tile => tile.type == 2));
            this.beliefs.updateBelief("spawnable", tiles.filter(tile => tile.type == 1));

            const { dist, prev, paths } = floydWarshallWithPaths(map);
            this.beliefs.updateBelief("dist", dist);
            this.beliefs.updateBelief("prev", prev);
            this.beliefs.updateBelief("paths", paths);
           
            this.startSemaphore.onMap = true;
        });

        this.api.onConfig(config => {
            const sanitized = sanitizeConfigs(config);
            console.log({ sanitized });
            writeConfigs(sanitized);
            this.startSemaphore.onConfig = true;
        });
    }

    private async deliberate(): Promise<void> {

        this.intentions.reviseIntentions(this.beliefs);
        const currentIntention = this.intentions.getCurrentIntention();

        if (!currentIntention || this.planAbortSignal) {
            if (this.isPlanRunning) {
                this.stopCurrentPlan();
            }
            const desires = this.desires.generateDesires(this.beliefs);
            for (const desire of desires) {
                const { path: plan = [], intention = null } = planFor(desire, this.beliefs) ?? {};
                if (plan?.length && intention) {
                    if (intention.type === desireType.MOVE) {
                        const attemptedHelp = this.beliefs.getBelief<boolean>("attemptingToHelpTeammate");
                        
                        if (!attemptedHelp && desires.length === 0) {
                            sendAvailabilityMessage(this.beliefs, this.api, true);
                        }
                    }else{
                        sendAvailabilityMessage(this.beliefs, this.api, false);
                        
                    }
                    this.intentions.adoptIntention(intention);
                    this.currentPlan = plan;
                    return this.executePlan();
                }else{
                    if (this.beliefs.getBelief<boolean>("isCollaborating")) {
                        sendAvailabilityMessage(this.beliefs, this.api, false);
                    }
                }
            }

            console.warn("No viable plan found, including fallback.");
        }
    
    }

    

    private async executePlan(): Promise<void> {
        if (this.isPlanRunning) return;
    
        this.isPlanRunning = true;
        this.planAbortSignal = false;
    
        try {
            const executor = createPlanExecutor({
                api: this.api,
                plan: this.currentPlan,
                actionMap: this.atomicActionToApi,
                isMovingAndBlocked: this.isMovingAndAgentBlocking.bind(this),
                shouldAbort: () => this.planAbortSignal,
                waitTimeMs: getConfig("MOVEMENT_DURATION") || WAIT_FOR_AGENT_MOVE_ON,
                maxRetries: MAX_BLOCK_RETRIES,
            });
    
            for await (const step of executor) {
                console.log(`[Plan] Executed ${step.action} with status: ${step.status}`);
                this.intentions.reviseIntentions(this.beliefs);
            }
    
        } catch (err) {
            if (err instanceof Error) {
                console.error("Plan executor failed:",err.message); // just the message, no stack trace
            } else {
                console.error(String(err)); // fallback for non-Error objects
            }

            this.stopCurrentPlan();
    
            const fallback = this.intentions.getCurrentIntention()
                ? planFor(this.intentions.getCurrentIntention()!, this.beliefs)
                : null;
    
            if (fallback) {
                this.intentions.adoptIntention(fallback.intention);
                this.currentPlan = fallback.path;
                return this.executePlan();
            }
        }
    
        this.isPlanRunning = false;
        if (!this.planAbortSignal) {
            console.log("Plan execution completed.");
        }
    }
    private stopCurrentPlan(): void {
        console.log("Stopping plan.");
        this.planAbortSignal = true;
        this.isPlanRunning = false;
        this.currentPlan = [];
    }


    private isMovingAndAgentBlocking(action: atomicActions ): boolean {
        if(action !== atomicActions.moveDown && action!== atomicActions.moveLeft && action!== atomicActions.moveRight && action!== atomicActions.moveUp){
            return false;
        }
        const current = this.beliefs.getBelief<Position>("position");
        const map = this.beliefs.getBelief<MapConfig>("map");
        if (!current || !map) throw new Error("Missing position or map");
        
        const delta = {
            [atomicActions.moveDown]: { x: 0, y: 1 },
            [atomicActions.moveLeft]: { x: -1, y: 0 },
            [atomicActions.moveRight]: { x: 1, y: 0 },
            [atomicActions.moveUp]: { x: 0, y: -1 }
        }[action];

        const target = { x: current.x + delta.x, y: current.y + delta.y };
        const agents = this.beliefs.getBelief<Agent[]>("agents") ?? [];
        return agents.some(a => a.x === target.x && a.y === target.y);
    }
}
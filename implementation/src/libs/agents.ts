import { BeliefBase } from "./beliefs";
import { DesireGenerator } from "./desire";
import { IntentionManager } from "./intentions";
import { planFor } from "./planner";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { floydWarshallWithPaths } from "./utils/pathfinding";
import { getCenterDirectionTilePosition } from "./utils/desireUtils";
import {
    MapConfig, Position, atomicActions, AgentLog, Intention,
    desireType, Agent
} from "../types/types";
import {
    EXPLORATION_STEP_TOWARDS_CENTER, MAX_BLOCK_RETRIES, WAIT_FOR_AGENT_MOVE_ON
} from "../config";
import { sanitizeConfigs, writeConfigs } from "./utils/common";

export class AgentBDI {
    private api: DeliverooApi;
    private beliefs: BeliefBase = new BeliefBase();
    private desires = new DesireGenerator();
    private intentions = new IntentionManager();
    private currentPlan: atomicActions[] = [];
    private atomicActionToApi = new Map<atomicActions, (api: DeliverooApi) => Promise<any>>();
    private isPlanRunning = false;
    private planAbortSignal = false;
    private isDeliberating = false;
    private blockRetryCount = 0;

    constructor(api: DeliverooApi) {
        this.api = api;
        this.initActionHandlers();
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

    public play(): void {
        this.api.onYou(data => {
            this.beliefs.updateBelief("position", { x: Math.round(data.x), y: Math.round(data.y) });
            this.beliefs.updateBelief("id", data.id);
            this.beliefs.updateBelief("score", data.score);
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
            const map: MapConfig = { width, height, tiles };
            this.beliefs.updateBelief("map", map);
            const { dist, prev, paths } = floydWarshallWithPaths(map);
            this.beliefs.updateBelief("dist", dist);
            this.beliefs.updateBelief("prev", prev);
            this.beliefs.updateBelief("paths", paths);
            this.beliefs.updateBelief("deliveries", tiles.filter(tile => tile.delivery));

            setInterval(() => this.deliberate().catch(console.error), 1000);
        });

        this.api.onConfig(config => {
            const sanitized = sanitizeConfigs(config);
            console.log({ sanitized });
            writeConfigs(sanitized);
        });
    }

    private async deliberate(): Promise<void> {
        if (this.isPlanRunning || this.isDeliberating) return;

        this.isDeliberating = true;

        try {
            this.intentions.reviseIntentions(this.beliefs);
            const currentIntention = this.intentions.getCurrentIntention();

            if (!currentIntention || this.planAbortSignal) {
                if (this.isPlanRunning) {
                    this.stopCurrentPlan();
                }
                for (const desire of this.desires.generateDesires(this.beliefs)) {
                    const plan = planFor(desire, this.beliefs);
                    if (plan?.length) {
                        this.intentions.adoptIntention(desire);
                        this.currentPlan = plan;
                        return this.executePlan();
                    }
                }

                console.warn("No viable plan found, including fallback.");
            }
        } finally {
            this.isDeliberating = false;
        }
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

    private async executePlan(): Promise<void> {
        if (this.isPlanRunning) return;
    
        this.isPlanRunning = true;
        this.planAbortSignal = false;

        while (this.currentPlan.length && !this.planAbortSignal) {
            const action = this.currentPlan.shift()!;
            const fn = this.atomicActionToApi.get(action);
            if (!fn) continue;

            try {
                const res = await fn(this.api);
                if (!res && this.isMovingAndAgentBlocking(action)) {
                    if (++this.blockRetryCount >= MAX_BLOCK_RETRIES) {
                        console.log("Max block retries reached, stopping plan.");
                        this.blockRetryCount = 0;
                        throw new Error("Max block retries reached");
                    }
                    console.log("Agent blocking, waiting...");
                    await new Promise(r => setTimeout(r, WAIT_FOR_AGENT_MOVE_ON));
                    this.currentPlan.unshift(action);
                } else if (!res) {
                    this.blockRetryCount = 0;
                    throw new Error("Action failed");
                } else {
                    this.blockRetryCount = 0;
                }
            } catch (err) {
                this.stopCurrentPlan();
                const intention = this.intentions.getCurrentIntention();
                if (intention) {
                    const newPlan = planFor(intention, this.beliefs);
                    if (newPlan?.length) {
                        this.currentPlan = newPlan;
                        return this.executePlan();
                    }
                }
                break;
            }
        }

        this.isPlanRunning = false;
        if (!this.planAbortSignal) console.log("Plan execution completed.");
    }

    private stopCurrentPlan(): void {
        console.log("Stopping plan.");
        this.planAbortSignal = true;
        this.isPlanRunning = false;
        this.currentPlan = [];
    }
}
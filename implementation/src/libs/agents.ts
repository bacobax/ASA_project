import { BeliefBase } from "./beliefs";
import { DesireGenerator } from "./desire";
import { IntentionManager } from "./intentions";
import { planFor } from "./planner";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { floydWarshallWithPaths } from "./utils/pathfinding";
import { getCenterDirectionTilePosition } from "./utils/desireUtils";

import {
    MapConfig,
    Position,
    atomicActions,
    AgentLog,
    Intention,
    desireType
} from "../types/types";
import { EXPLORATION_STEP_TOWARDS_CENTER } from "../config";

export class AgentBDI {
    private api: DeliverooApi;
    private beliefs: BeliefBase = new BeliefBase();
    private desires: DesireGenerator;
    
    private intentions: IntentionManager;
    private currentPlan: atomicActions[] = [];
    private atomicActionToApi = new Map<atomicActions, (api: DeliverooApi) => Promise<any>>();
    private isPlanRunning = false;
    private planAbortSignal = false;
    private isDeliberating = false;
    private readonly MAX_PLAN_ATTEMPTS = 5;

    constructor(api: DeliverooApi) {
        this.api = api;
        this.desires = new DesireGenerator();
        this.intentions = new IntentionManager();
        

        this.atomicActionToApi.set(atomicActions.moveRight, api => api.move("right"));
        this.atomicActionToApi.set(atomicActions.moveLeft, api => api.move("left"));
        this.atomicActionToApi.set(atomicActions.moveUp, api => api.move("up"));
        this.atomicActionToApi.set(atomicActions.moveDown, api => api.move("down"));
        this.atomicActionToApi.set(atomicActions.pickup, api => api.pickup());
        this.atomicActionToApi.set(atomicActions.drop, api => api.putdown());


    }

    public play() {
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
            for (let agent of agents) {
                if (this.beliefs.getBelief(agent.id) === undefined) {
                    this.beliefs.updateBelief(agent.id, [] as AgentLog[]);
                }
                const agentLogs: AgentLog[] = this.beliefs.getBelief(agent.id) as AgentLog[];
                agentLogs.push({
                    prevPosition: { x: agent.x, y: agent.y },
                    timestamp
                });
                this.beliefs.updateBelief(agent.id, agentLogs);
            }
        });

        this.api.onMap((width, height, data) => {
            const map: MapConfig = {
                width,
                height,
                tiles: data
            };
            this.beliefs.updateBelief("map", map);
            const { dist, prev, paths } = floydWarshallWithPaths(map);
            this.beliefs.updateBelief("dist", dist);
            this.beliefs.updateBelief("prev", prev);
            this.beliefs.updateBelief("paths", paths);
            this.beliefs.updateBelief("deliveries", map.tiles.filter(tile => tile.delivery === true));

            setInterval(async () => {
                try {
                    await this.deliberate();
                } catch (err) {
                    console.error("Deliberation error:", err);
                }
            }, 1000);
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
    
                const possibleDesires = this.desires.generateDesires(this.beliefs);
    
                for (const desire of possibleDesires) {
                    const plan = planFor(desire, this.beliefs);
                    if (plan && plan.length > 0) {
                        this.intentions.adoptIntention(desire);
                        this.currentPlan = plan;
                        return this.executePlan();
                    }
                }
    
                const fallbackIntention: Intention = {
                    type: desireType.MOVE,
                    position: getCenterDirectionTilePosition(
                        EXPLORATION_STEP_TOWARDS_CENTER,
                        this.beliefs.getBelief("position") as Position,
                        this.beliefs
                    )
                };
                const fallbackPlan = planFor(fallbackIntention, this.beliefs);
                if (fallbackPlan && fallbackPlan.length > 0) {
                    this.intentions.adoptIntention(fallbackIntention);
                    this.currentPlan = fallbackPlan;
                    return this.executePlan();
                }
    
                console.warn("No plan found for any desire including fallback.");
            }
        } finally {
            this.isDeliberating = false;
        }
    }

    private async executePlan(): Promise<void> {
        if (this.isPlanRunning) {
            console.log("Execution already in progress.");
            return;
        }

        this.isPlanRunning = true;
        this.planAbortSignal = false;

        while (this.currentPlan.length > 0 && !this.planAbortSignal) {
            const action = this.currentPlan.shift()!;
            const actionFn = this.atomicActionToApi.get(action);

            if (!actionFn) {
                console.warn("No API mapping for action:", action);
                continue;
            }

            try {
                const res = await actionFn(this.api);
                if (!res) throw new Error("Action failed");
            } catch (err) {
                console.warn(`Action ${action} failed, replanning...`);
                this.stopCurrentPlan();

                const currentIntention = this.intentions.getCurrentIntention();
                if (currentIntention) {
                    const newPlan = planFor(currentIntention, this.beliefs);
                    if (newPlan && newPlan.length > 0) {
                        this.currentPlan = newPlan;
                        console.log("Replanned successfully.");
                        return this.executePlan(); // recursive retry
                    }
                }

                break;
            }
        }

        this.isPlanRunning = false;
        if (!this.planAbortSignal) {
            console.log("Plan execution completed.");
        }
    }

    private stopCurrentPlan() {
        console.log("Stopping current plan.");
        this.planAbortSignal = true;
        this.isPlanRunning = false;
        this.currentPlan = [];
    }
}
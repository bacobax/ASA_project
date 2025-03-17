import { BeliefBase } from "./beliefs";
import { DesireGenerator } from "./desire";
import { IntentionManager } from "./intentions";
import { Planner } from "./planner";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { floydWarshallWithPaths, getTilePosition } from "./utils";
import { MapConfig, Position, atomicActions } from "../types/types";

export class AgentBDI {
    private api: DeliverooApi;
    private beliefs: BeliefBase = new BeliefBase();
    private desires: DesireGenerator;
    private intentions: IntentionManager;
    private planner: Planner;
    private currentPlan: atomicActions[] = [];
    private atomicActionToApi = new Map<atomicActions, (api: DeliverooApi) => Promise<any>>();
    private isPlanRunning: boolean = false; // Flag to track if a plan is running
    private planAbortSignal: boolean = false; // Abort signal to stop the current plan

    constructor(api: DeliverooApi) {
        this.api = api;
        this.desires = new DesireGenerator();
        this.intentions = new IntentionManager();
        this.planner = new Planner();

        this.atomicActionToApi.set(atomicActions.moveRight, api => api.move("right"));
        this.atomicActionToApi.set(atomicActions.moveLeft, api => api.move("left"));
        this.atomicActionToApi.set(atomicActions.moveUp, api => api.move("up"));
        this.atomicActionToApi.set(atomicActions.moveDown, api => api.move("down"));
        this.atomicActionToApi.set(atomicActions.pickup, api => api.pickup());
        this.atomicActionToApi.set(atomicActions.drop, api => api.putdown());

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.api.onYou(data => {
            this.beliefs.updateBelief("position", { x: Math.round(data.x), y: Math.round(data.y) });
            this.beliefs.updateBelief("id", data.id);
            this.beliefs.updateBelief("score", data.score);
        });

        this.api.onParcelsSensing(parcels => {
            this.beliefs.updateBelief("visibleParcels", parcels);
            this.intentions.reviseIntentions(this.beliefs);
        });

        this.api.onMap((width, height, data) => {
            let map: MapConfig = {
                width: width,
                height: height,
                tiles: data
            };

            this.beliefs.updateBelief("map", map);
            const { dist, prev, paths } = floydWarshallWithPaths(map);
            // for(let i = 0; i<100; i++){
            //     for(let j = 0; j<100; j++){
            //         if(i!=j){
            //             if(dist[i][j]!=Infinity){
            //                 console.log("--------from ", getTilePosition(i, 10), " to ", getTilePosition(j, 10),":");
            //                 console.log(dist[i][j]);
            //             }
            //         }
            //     }
            // }
            this.beliefs.updateBelief("dist", dist);
            this.beliefs.updateBelief("prev", prev);
            this.beliefs.updateBelief("paths", paths);
            this.beliefs.updateBelief("deliveries", map.tiles.filter(tile => tile.delivery === true));

            setInterval(() => this.deliberate(), 1000);
        });
    }

    private deliberate() {
        this.intentions.reviseIntentions(this.beliefs);

        if (!this.intentions.hasIntentions() || this.planAbortSignal) {
            if (this.isPlanRunning) {
                console.log("Plan has been interrupted due to a new intention or invalid state.");
                this.stopCurrentPlan(); // Stop the current plan if needed
            }

            const newDesires = this.desires.generateDesires(this.beliefs);
            if (newDesires.length > 0) {
                const newIntention = newDesires[0];
                this.intentions.adoptIntention(newIntention);
                this.currentPlan = this.planner.planFor(newIntention, this.beliefs);
                this.executePlan();
            }
        }
    }

    private async executePlan() {
        if (this.isPlanRunning) {
            console.log("Plan already running, aborting new execution.");
            return; // Prevent starting a new plan if one is already running
        }

        console.log("Executing plan", this.currentPlan);
        this.isPlanRunning = true; // Mark the plan as running
        this.planAbortSignal = false; // Reset abort signal

        while (this.currentPlan.length > 0 && !this.planAbortSignal) {
            const step = this.currentPlan.shift() as atomicActions;
            const correctClientAction = this.atomicActionToApi.get(step);

            if (!correctClientAction) continue;

            const res = await correctClientAction(this.api);
            if (!res) {
                console.log("Failed ", step);
                this.stopCurrentPlan(); // Stop the plan if it fails
                break;
            } else {
                //console.log("Success ", step, "\ndata: ", res);
            }
        }

        if (!this.planAbortSignal) {
            console.log("Plan completed successfully.");
        }
        this.isPlanRunning = false; // Mark the plan as completed
    }

    private stopCurrentPlan() {
        console.log("Stopping current plan.");
        this.planAbortSignal = true; // Set the abort signal to stop execution
        this.isPlanRunning = false; // Reset the running state
        this.currentPlan = []; // Optionally, clear the current plan
    }
}

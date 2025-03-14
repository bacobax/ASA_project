import { BeliefBase } from "./beliefs";
import { DesireGenerator } from "./desire";
import { IntentionManager } from "./intentions";
import { Planner } from "./planner";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Intention } from "../types/types";
import { MapConfig } from "../types/types";
import { atomicActions } from "./plans";

export class AgentBDI {
    private api: DeliverooApi;
    private beliefs: BeliefBase = new BeliefBase();
    private desires:DesireGenerator;
    private intentions:IntentionManager;
    private planner:Planner;
    private currentPlan: atomicActions[] = [];
    private atomicActionToApi = new Map<atomicActions, (api: DeliverooApi) => void>();

    constructor(api: DeliverooApi) {
        this.api = api;
        this.desires = new DesireGenerator();
        this.intentions = new IntentionManager();
        this.planner = new Planner();

        this.atomicActionToApi.set(atomicActions.moveRight,  api => api.move("right"));
        this.atomicActionToApi.set(atomicActions.moveLeft,  api => api.move("left"));
        this.atomicActionToApi.set(atomicActions.moveUp,  api => api.move("up"));
        this.atomicActionToApi.set(atomicActions.moveDown, api => api.move("down"));
        this.atomicActionToApi.set(atomicActions.pickup, api => api.pickup());
        this.atomicActionToApi.set(atomicActions.drop, api => api.putdown());
        
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.api.onYou(data => this.beliefs.updateBelief("position", { x: data.x, y: data.y }));
        this.api.onParcelsSensing(parcels => {
            this.beliefs.updateBelief("visibleParcels", parcels);
            this.intentions.reviseIntentions(this.beliefs);
        });
        this.api.onMap((width, height, data) => {
            const map: MapConfig = {
                width: width,
                height: height,
                tiles: data
            }
            this.beliefs.updateBelief("map", map);
        });

        setInterval(() => this.deliberate(), 1000);
    }

    private deliberate() {
        this.intentions.reviseIntentions(this.beliefs);

        if (!this.intentions.hasIntentions()) {
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
        console.log("Executing plan", this.currentPlan);
        //TO REIMPLEMENT
        while (this.currentPlan.length > 0) {
            const step = this.currentPlan.shift() as atomicActions;
            const correctClientAction = this.atomicActionToApi.get(step);
            if(!correctClientAction) continue;
            correctClientAction(this.api);
        }
    }
}
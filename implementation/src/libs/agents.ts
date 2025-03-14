import { BeliefBase } from "./beliefs";
import { DesireGenerator } from "./desire";
import { IntentionManager } from "./intentions";
import { Planner } from "./planner";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Intention } from "../types/types";
import { MapConfig } from "../types/types";

export class AgentBDI {
    private api: DeliverooApi;
    private beliefs: BeliefBase = new BeliefBase();
    private desires:DesireGenerator;
    private intentions:IntentionManager;
    private planner:Planner;
    private currentPlan: { action: string; x?: number; y?: number }[] = [];

    constructor(api: DeliverooApi) {
        this.api = api;
        this.desires = new DesireGenerator();
        this.intentions = new IntentionManager();
        this.planner = new Planner();

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
            const step = this.currentPlan.shift();
            if (step?.action === "move" && step.x !== undefined && step.y !== undefined) {
                await this.api.move("right");
            } else if (step?.action === "pickup") {
                await this.api.pickup();
            } else if (step?.action === "putdown") {
                await this.api.putdown();
            }
        }
    }
}
import { BeliefBase } from "./beliefs";
import { DesireGenerator } from "./desire";
import { IntentionManager } from "./intentions";
import { Planner } from "./planner";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Intention } from "./types";

export class AgentBDI {
    private api: DeliverooApi;
    private beliefs = new BeliefBase();
    private desires = new DesireGenerator();
    private intentions = new IntentionManager();
    private planner = new Planner();
    private currentPlan: { action: string; x?: number; y?: number }[] = [];

    constructor(api: DeliverooApi) {
        this.api = api;
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.api.onYou(data => this.beliefs.updateBelief("position", { x: data.x, y: data.y }));
        this.api.onParcelsSensing(parcels => {
            this.beliefs.updateBelief("visibleParcels", parcels);
            this.intentions.reviseIntentions(this.beliefs);
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
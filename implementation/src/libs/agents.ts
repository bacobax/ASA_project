import { BeliefBase } from "./beliefs";
import { DesireGenerator } from "./desire";
import { IntentionManager } from "./intentions";
import { Planner } from "./planner";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { floydWarshallWithPaths } from "./utils";
import { MapConfig, Position, atomicActions } from "../types/types";

export class AgentBDI {
    private api: DeliverooApi;
    private beliefs: BeliefBase = new BeliefBase();
    private desires:DesireGenerator;
    private intentions:IntentionManager;
    private planner:Planner;
    private currentPlan: atomicActions[] = [];
    private atomicActionToApi = new Map<atomicActions, (api: DeliverooApi) => Promise<any>>();

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
            let map: MapConfig = {
                width: width,
                height: height,
                tiles: data
            }

            this.beliefs.updateBelief("map", map);
            const {dist, prev, paths} = floydWarshallWithPaths(map);
            this.beliefs.updateBelief("dist", dist);
            this.beliefs.updateBelief("prev", prev);
            this.beliefs.updateBelief("paths", paths);
            this.beliefs.updateBelief("deliveries", map.tiles.filter(tile => tile.delivery === true))

            setInterval(() => this.deliberate(), 1000);
        });

        
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
            const res = await correctClientAction(this.api);
            if(!res){
                console.log("Failed ", step);
            }else{
                console.log("Success ", step, "\ndata: ", res)
            }
        }
    }
}
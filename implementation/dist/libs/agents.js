"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentBDI = void 0;
const beliefs_1 = require("./beliefs");
const desire_1 = require("./desire");
const intentions_1 = require("./intentions");
const planner_1 = require("./planner");
const utils_1 = require("./utils");
const types_1 = require("../types/types");
class AgentBDI {
    constructor(api) {
        this.beliefs = new beliefs_1.BeliefBase();
        this.currentPlan = [];
        this.atomicActionToApi = new Map();
        this.isPlanRunning = false; // Flag to track if a plan is running
        this.planAbortSignal = false; // Abort signal to stop the current plan
        this.api = api;
        this.desires = new desire_1.DesireGenerator();
        this.intentions = new intentions_1.IntentionManager();
        this.planner = new planner_1.Planner();
        this.atomicActionToApi.set(types_1.atomicActions.moveRight, api => api.move("right"));
        this.atomicActionToApi.set(types_1.atomicActions.moveLeft, api => api.move("left"));
        this.atomicActionToApi.set(types_1.atomicActions.moveUp, api => api.move("up"));
        this.atomicActionToApi.set(types_1.atomicActions.moveDown, api => api.move("down"));
        this.atomicActionToApi.set(types_1.atomicActions.pickup, api => api.pickup());
        this.atomicActionToApi.set(types_1.atomicActions.drop, api => api.putdown());
        this.setupEventListeners();
    }
    setupEventListeners() {
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
            let map = {
                width: width,
                height: height,
                tiles: data
            };
            this.beliefs.updateBelief("map", map);
            const { dist, prev, paths } = (0, utils_1.floydWarshallWithPaths)(map);
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
    deliberate() {
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
    executePlan() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isPlanRunning) {
                console.log("Plan already running, aborting new execution.");
                return; // Prevent starting a new plan if one is already running
            }
            console.log("Executing plan", this.currentPlan);
            this.isPlanRunning = true; // Mark the plan as running
            this.planAbortSignal = false; // Reset abort signal
            while (this.currentPlan.length > 0 && !this.planAbortSignal) {
                const step = this.currentPlan.shift();
                const correctClientAction = this.atomicActionToApi.get(step);
                if (!correctClientAction)
                    continue;
                const res = yield correctClientAction(this.api);
                if (!res) {
                    console.log("Failed ", step);
                    this.stopCurrentPlan(); // Stop the plan if it fails
                    break;
                }
                else {
                    //console.log("Success ", step, "\ndata: ", res);
                }
            }
            if (!this.planAbortSignal) {
                console.log("Plan completed successfully.");
            }
            this.isPlanRunning = false; // Mark the plan as completed
        });
    }
    stopCurrentPlan() {
        console.log("Stopping current plan.");
        this.planAbortSignal = true; // Set the abort signal to stop execution
        this.isPlanRunning = false; // Reset the running state
        this.currentPlan = []; // Optionally, clear the current plan
    }
}
exports.AgentBDI = AgentBDI;

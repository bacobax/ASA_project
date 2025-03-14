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
class AgentBDI {
    constructor(api) {
        this.beliefs = new beliefs_1.BeliefBase();
        this.desires = new desire_1.DesireGenerator();
        this.intentions = new intentions_1.IntentionManager();
        this.planner = new planner_1.Planner();
        this.currentPlan = [];
        this.api = api;
        this.setupEventListeners();
    }
    setupEventListeners() {
        this.api.on("you", data => this.beliefs.updateBelief("position", { x: data.x, y: data.y }));
        this.api.on("parcelsSensing", parcels => {
            this.beliefs.updateBelief("visibleParcels", parcels);
            this.intentions.reviseIntentions(this.beliefs);
        });
        setInterval(() => this.deliberate(), 1000);
    }
    deliberate() {
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
    executePlan() {
        return __awaiter(this, void 0, void 0, function* () {
            while (this.currentPlan.length > 0) {
                const step = this.currentPlan.shift();
                if ((step === null || step === void 0 ? void 0 : step.action) === "move" && step.x !== undefined && step.y !== undefined) {
                    yield this.api.move("right");
                }
                else if ((step === null || step === void 0 ? void 0 : step.action) === "pickup") {
                    yield this.api.pickup();
                }
                else if ((step === null || step === void 0 ? void 0 : step.action) === "putdown") {
                    yield this.api.putdown();
                }
            }
        });
    }
}
exports.AgentBDI = AgentBDI;

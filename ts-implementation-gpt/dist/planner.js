"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
const plans_1 = require("../plans");
class Planner {
    planFor(intention, beliefs) {
        return plans_1.PlanLibrary.getPlan(intention);
    }
}
exports.Planner = Planner;

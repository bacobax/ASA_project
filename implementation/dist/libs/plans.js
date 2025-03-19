"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanLibrary = void 0;
const types_1 = require("../types/types");
const utils_1 = require("./utils");
class PlanLibrary {
    static getPlan(intention, beliefs) {
        const curPos = beliefs.getBelief("position");
        const map = beliefs.getBelief("map");
        var actions = [];
        switch (intention.type) {
            case "pickup":
                if (intention.position !== undefined && (intention.position.x != curPos.x || intention.position.y != curPos.y)) {
                    actions = (0, utils_1.getOptimalPath)(curPos, intention.position, map.width, map.height, beliefs.getBelief("paths"));
                }
                actions.push(types_1.atomicActions.pickup);
                return actions;
            case "deliver":
                const deliveryPos = (0, utils_1.getDeliverySpot)(curPos, 0, beliefs);
                actions = (0, utils_1.getOptimalPath)(curPos, deliveryPos, map.width, map.height, beliefs.getBelief("paths"));
                actions.push(types_1.atomicActions.drop);
                return actions;
            case "move":
                if (intention.position !== undefined && (intention.position.x != curPos.x || intention.position.y != curPos.y)) {
                    actions = (0, utils_1.getOptimalPath)(curPos, intention.position, map.width, map.height, beliefs.getBelief("paths"));
                }
                return actions;
            default:
                return [];
        }
    }
}
exports.PlanLibrary = PlanLibrary;

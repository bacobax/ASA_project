"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanLibrary = void 0;
class PlanLibrary {
    static getPlan(intention) {
        switch (intention.type) {
            case "pickup":
                return [{ action: "move", x: intention.x, y: intention.y }, { action: "pickup" }];
            case "deliver":
                return [{ action: "move", x: 0, y: 0 }, { action: "putdown" }];
            default:
                return [];
        }
    }
}
exports.PlanLibrary = PlanLibrary;

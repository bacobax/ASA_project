import { Intention } from "./types";

export class PlanLibrary {
    static getPlan(intention: Intention): { action: string; x?: number; y?: number }[] {
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
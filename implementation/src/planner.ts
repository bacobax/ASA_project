import { BeliefBase } from "./beliefs";
import { Intention } from "./types/types";
import { PlanLibrary } from "./plans";

export class Planner {
    planFor(intention: Intention, beliefs: BeliefBase) {
        return PlanLibrary.getPlan(intention);
    }
}
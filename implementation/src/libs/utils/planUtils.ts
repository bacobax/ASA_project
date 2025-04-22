import { MapConfig, Parcel,Position, ServerConfig, atomicActions } from "../../types/types";
import { getOptimalPath } from "../utils/pathfinding";
import { getNearestDeliverySpot } from "../utils/desireUtils";
import { BeliefBase } from "../beliefs";




import { timeForPath } from "../utils/desireUtils";
import { getConfig } from "./common";

export interface ParcelPlanStep {
    parcel: Parcel;
    action: "pickup" | "deliver";
    path: atomicActions[];
}

export function evaluateParcelComboPlan(
    steps: ParcelPlanStep[],
    decayInterval: number
): { score: number; totalTime: number } {
    let time = 0;
    let score = 0;

    for (const step of steps) {
        const pathTime = timeForPath({ path: step.path }).time;
        time += pathTime;

        if (step.action === "deliver") {
            score += step.parcel.reward * Math.exp(-time / decayInterval);
        }
    }

    return { score, totalTime: time };
}

export const parcelsCompare = (a: Parcel & {distance:number}, b: Parcel & {distance:number}) => {
    const REWARD_WEIGHT = 1.5;
    const DISTANCE_WEIGHT = 1.0;
    const priorityA = a.distance !== Infinity ? (a.reward * REWARD_WEIGHT) / (a.distance * DISTANCE_WEIGHT) : 0;
    const priorityB = b.distance !== Infinity ? (b.reward * REWARD_WEIGHT) / (b.distance * DISTANCE_WEIGHT) : 0;
    return priorityB - priorityA;
}


export function planMultiPickupStrategy(
    beliefs: BeliefBase,
    carriedParcels: Parcel[],
    uncarriedParcels: Parcel[]
): { plan: ParcelPlanStep[]; score: number } | null {
    const currentPos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map");
    const decayInterval = getConfig<number>("PARCEL_DECADING_INTERVAL");
    
    if(!decayInterval) throw new Error("PARCEL_DECADING_INTERVAL not found");


    if (!map) return null;

    let bestPlan: ParcelPlanStep[] = [];
    let bestScore = -Infinity;

    for (const parcel1 of uncarriedParcels) {
        const pathTo1 = getOptimalPath(currentPos, { x: parcel1.x, y: parcel1.y }, map, beliefs);
        if (!pathTo1) continue;

        const delivery1 = getNearestDeliverySpot({ startPosition: { x: parcel1.x, y: parcel1.y }, beliefs });
        if (!delivery1) continue;

        // One-pickup strategy
        const plan1: ParcelPlanStep[] = [
            { parcel: parcel1, action: "pickup", path: pathTo1 },
            { parcel: parcel1, action: "deliver", path: delivery1.path },
        ];
        const score1 = evaluateParcelComboPlan(plan1, decayInterval);
        if (score1.score > bestScore) {
            bestPlan = plan1;
            bestScore = score1.score;
        }

        for (const parcel2 of uncarriedParcels) {
            if (parcel2.id === parcel1.id) continue;

            const pathTo2 = getOptimalPath(
                { x: parcel1.x, y: parcel1.y },
                { x: parcel2.x, y: parcel2.y },
                map,
                beliefs
            );
            if (!pathTo2) continue;

            const delivery2 = getNearestDeliverySpot({ startPosition: { x: parcel2.x, y: parcel2.y }, beliefs });
            if (!delivery2) continue;

            const plan2: ParcelPlanStep[] = [
                { parcel: parcel1, action: "pickup", path: pathTo1 },
                { parcel: parcel2, action: "pickup", path: pathTo2 },
                { parcel: parcel1, action: "deliver", path: delivery1.path },
                { parcel: parcel2, action: "deliver", path: delivery2.path },
            ];

            const score2 = evaluateParcelComboPlan(plan2, decayInterval);
            if (score2.score > bestScore) {
                bestPlan = plan2;
                bestScore = score2.score;
            }
        }
    }

    return bestPlan.length > 0 ? { plan: bestPlan, score: bestScore } : null;
}


import {
    AGGRESSIVE_DISTANCE_WEIGHT,
    DISTANCE_WEIGHT,
    REWARD_WEIGHT,
    S_DISTANCE_WEIGHT,
    S_REWARD_WEIGHT,
} from "../../config";
import { AgentLog, Parcel, Position, atomicActions } from "../../types/types";
import { BeliefBase } from "../beliefs";
import { timeForPath } from "../utils/desireUtils";
import { Strategies } from "./common";

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

export const parcelsCompare = (strategy: Strategies) => {
    return (
        a: Parcel & { distance: number },
        b: Parcel & { distance: number }
    ) => {
        const priorityA =
            a.distance !== Infinity
                ? rewardNormalizations[strategy](a.reward, a.distance)
                : 0;
        const priorityB =
            b.distance !== Infinity
                ? rewardNormalizations[strategy](b.reward, b.distance)
                : 0;
        return priorityB - priorityA;
    };
};
export const linearReward = (
    reward: number,
    distance: number,
    rewardWeight: number = REWARD_WEIGHT,
    distanceWeight: number = DISTANCE_WEIGHT
): number => {
    return (reward * rewardWeight) / (distance * distanceWeight);
};

export const aggressiveReward = (
    reward: number,
    distance: number,
    distanceWeight: number = AGGRESSIVE_DISTANCE_WEIGHT
) => {
    return (reward / distance) ^ distanceWeight;
};

export const sophisticatedReward = (
    reward: number,
    distance: number,
    rewardWeight: number = S_REWARD_WEIGHT,
    distanceWeight: number = S_DISTANCE_WEIGHT
) => {
    return (reward ^ rewardWeight) / (distance ^ distanceWeight);
};

export const rewardNormalizations = {
    [Strategies.aggressive]: aggressiveReward,
    [Strategies.linear]: linearReward,
    [Strategies.sophisticated]: sophisticatedReward,
};

export function isTeammateAtPosition(
    target: Position,
    beliefs: BeliefBase
): boolean {
    const teammates = beliefs.getBelief<string[]>("teammatesIds") || [];
    for (const id of teammates) {
        const teammateLogs = beliefs.getBelief<AgentLog[]>(id) || [];
        if (teammateLogs.length > 0) {
            const lastLog = teammateLogs[teammateLogs.length - 1];
            if (
                lastLog.prevPosition.x === target.x &&
                lastLog.prevPosition.y === target.y
            ) {
                return true;
            }
        }
    }

    return false;
}

export function isTeammateAdjacentToPosition(
    target: Position,
    beliefs: BeliefBase
): boolean {
    const teammates = beliefs.getBelief<string[]>("teammatesIds") || [];
    for (const id of teammates) {
        const teammateLogs = beliefs.getBelief<AgentLog[]>(id) || [];
        if (teammateLogs.length > 0) {
            const lastLog = teammateLogs[teammateLogs.length - 1];
            const dx = Math.abs(lastLog.prevPosition.x - target.x);
            const dy = Math.abs(lastLog.prevPosition.y - target.y);
            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                return true;
            }
        }
    }

    return false;
}

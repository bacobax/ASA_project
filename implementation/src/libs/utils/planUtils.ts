import {
    AGGRESSIVE_DISTANCE_WEIGHT,
    DISTANCE_WEIGHT,
    REWARD_WEIGHT,
    S_DISTANCE_WEIGHT,
    S_REWARD_WEIGHT,
} from "../../config";
import { Agent, AgentLog, Parcel, Position, atomicActions } from "../../types/types";
import { BeliefBase } from "../beliefs";
import { timeForPath } from "../utils/desireUtils";
import { Strategies } from "./common";
import { manhattanDistance } from "./mapUtils";

export interface ParcelPlanStep {
    parcel: Parcel;
    action: "pickup" | "deliver";
    path: atomicActions[];
}

/**
 * Evaluates the total score and time for a given sequence of parcel plan steps.
 * The score decays exponentially based on the elapsed time and a decay interval.
 * 
 * @param steps - An array of ParcelPlanStep objects representing the plan.
 * @param decayInterval - The decay interval used for exponential decay of the reward.
 * @returns An object containing the total score and total time for the plan.
 */
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

/**
 * Returns a comparator function to sort parcels based on the specified strategy.
 * Parcels with higher priority scores will be sorted before lower priority ones.
 * 
 * @param strategy - The strategy used to normalize reward and distance into a priority score.
 * @returns A comparator function for sorting parcels.
 */
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

/**
 * Calculates a linear reward normalization based on reward and distance.
 * 
 * @param reward - The reward value of the parcel.
 * @param distance - The distance to the parcel.
 * @param rewardWeight - The weight applied to the reward (default REWARD_WEIGHT).
 * @param distanceWeight - The weight applied to the distance (default DISTANCE_WEIGHT).
 * @returns The normalized reward score.
 */
export const linearReward = (
    reward: number,
    distance: number,
    rewardWeight: number = REWARD_WEIGHT,
    distanceWeight: number = DISTANCE_WEIGHT
): number => {
    return (reward * rewardWeight) / (distance * distanceWeight);
};

/**
 * Calculates an aggressive reward normalization based on reward and distance.
 * 
 * @param reward - The reward value of the parcel.
 * @param distance - The distance to the parcel.
 * @param distanceWeight - The weight applied to the distance (default AGGRESSIVE_DISTANCE_WEIGHT).
 * @returns The normalized reward score.
 */
export const aggressiveReward = (
    reward: number,
    distance: number,
    distanceWeight: number = AGGRESSIVE_DISTANCE_WEIGHT
) => {
    return reward / ((distance) ^ distanceWeight);
};

/**
 * Calculates a sophisticated reward normalization based on reward and distance.
 * 
 * @param reward - The reward value of the parcel.
 * @param distance - The distance to the parcel.
 * @param rewardWeight - The weight applied to the reward (default S_REWARD_WEIGHT).
 * @param distanceWeight - The weight applied to the distance (default S_DISTANCE_WEIGHT).
 * @returns The normalized reward score.
 */
export const sophisticatedReward = (
    reward: number,
    distance: number,
    rewardWeight: number = S_REWARD_WEIGHT,
    distanceWeight: number = S_DISTANCE_WEIGHT
) => {
    return (reward ^ rewardWeight) / (distance ^ distanceWeight);
};

/**
 * Object mapping strategies to their corresponding reward normalization functions.
 */
export const rewardNormalizations = {
    [Strategies.aggressive]: aggressiveReward,
    [Strategies.linear]: linearReward,
    [Strategies.sophisticated]: sophisticatedReward,
};

/**
 * Checks if any teammate is at the specified target position.
 * 
 * @param target - The position to check.
 * @param beliefs - The belief base containing information about teammates.
 * @returns True if a teammate is at the target position, false otherwise.
 */
export function isTeammateAtPosition(
    target: Position,
    beliefs: BeliefBase
): boolean {
    const teammatesPositions = beliefs.getBelief<Record<string, Position>>(
        "teammatesPositions"
    ) || {};
    for( const id in teammatesPositions) {
        const pos = teammatesPositions[id];
        // Check if the teammate's position matches the target position
        if (pos.x === target.x && pos.y === target.y) {
            return true;
        }
    }

    return false;
}

/**
 * Checks if any teammate is adjacent (up, down, left, or right) to the specified target position.
 * 
 * @param target - The position to check adjacency against.
 * @param beliefs - The belief base containing information about teammates.
 * @returns True if a teammate is adjacent to the target position, false otherwise.
 */
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

/**
 * Checks if any teammate is currently in the agent's field of view.
 * 
 * @param beliefs - The belief base containing information about visible agents and teammates.
 * @returns True if any visible agent is a teammate, false otherwise.
 */
export function isTeammateInViewField(
    beliefs: BeliefBase
): boolean {
    const visibleAgents = beliefs.getBelief<Agent[]>("agents") || [];
    const teammatesIds = beliefs.getBelief<string[]>("teammatesIds") || [];
    
    // Check if any visible agent is a teammate
    return visibleAgents.some(agent => teammatesIds.includes(agent.id));
}

/**
 * Checks if a parcel is adjacent (Manhattan distance of 1) to the specified target position.
 * 
 * @param target - The position to check adjacency against.
 * @param parcel - The parcel whose position is checked.
 * @returns True if the parcel is adjacent to the target position, false otherwise.
 */
export function isParcelAdjacentToPosition(
    target: Position,
    parcel: Parcel
): boolean {
    if (manhattanDistance(target, parcel) === 1) {
        return true;
    }
    return false;
}

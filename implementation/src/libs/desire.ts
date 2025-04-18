import { BeliefBase } from "./beliefs";
import { atomicActions, desireType, Intention, MapConfig, Parcel, Position } from "../types/types";
import { getCenterDirectionTilePosition, timeForPath } from "./utils/desireUtils";
import {  getNearestParcel, getNearestDeliverySpot } from "./utils/desireUtils";
import { DECAY_INTERVAL, EXPLORATION_STEP_TOWARDS_CENTER } from "../config";
import { getOptimalPath } from "./utils/pathfinding";

/**
 * Interface for reward calculation parameters
 */
interface RewardCalculationParams {
    optionalParcel: Parcel;
    carryingParcels: Parcel[];
    timeForSecondaryPath: number;
    beliefs: BeliefBase;
}

export interface ReachableParcel {
    parcel: Parcel;
    path: atomicActions[];
    time: number;
}

interface ReachableParcelArgs {
    beliefs: BeliefBase;
    filter?: (parcel: Parcel) => boolean;
}

export const getReachableParcels = ({ beliefs, filter }: ReachableParcelArgs): ReachableParcel[] => {
    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const curPos = beliefs.getBelief<Position>("position");
    const map = beliefs.getBelief<MapConfig>("map");

    if (!parcels || !curPos || !map) throw new Error("Missing beliefs");

    const uncarried = parcels.filter(p => !p.carriedBy && (!filter || filter(p)));

    const reachable: ReachableParcel[] = [];

    for (const parcel of uncarried) {
        const path = getOptimalPath(curPos, { x: parcel.x, y: parcel.y }, map, beliefs);
        if (!path) continue;

        const time = timeForPath({ path }).time;
        reachable.push({ parcel, path, time });
    }

    return reachable;
};
/**
 * DesireGenerator class handles the generation of desires (intentions) based on the agent's beliefs
 * and current state. It implements a reward-based decision-making system for parcel delivery.
 */
export class DesireGenerator {
    /**
     * Generates a list of desires based on current beliefs and state
     * @param beliefs Current belief base of the agent
     * @returns Array of intentions representing desires
     */
    /**
     * Generates all possible intentions based on the agent's current belief base.
     */
    generateDesires(beliefs: BeliefBase): Intention[] {
        console.log("-----Generating Desire Options-----");
        const desires: Intention[] = [];

        const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
        const curPos: Position = beliefs.getBelief("position") as Position;
        const agentId = beliefs.getBelief<string>("id");
        const carryingParcels = parcels?.filter(p => p.carriedBy === agentId) ?? [];

        if (carryingParcels.length > 0) {
            // Try to pick up more if possible
            const pickup = this.considerAdditionalPickup(parcels, beliefs, carryingParcels);
            if (pickup) desires.push(pickup)
            desires.push({ type: desireType.DELIVER });

            // Deliver what you're carrying
            //desires.push({ type: desireType.DELIVER });
        } else if (parcels && parcels.length > 0) {
            // Attempt pickup of available parcels
            const pickupCandidates = parcels.filter(p => p.x !== curPos.x || p.y !== curPos.y);
            if (pickupCandidates.length > 0) {
                desires.push({
                    type: desireType.PICKUP,
                    possilbeParcels: pickupCandidates,
                });
            }
        }

        // Always have a fallback desire to explore
        desires.push({
            type: desireType.MOVE,
            position: getCenterDirectionTilePosition(
                EXPLORATION_STEP_TOWARDS_CENTER,
                curPos,
                beliefs
            ),
        });

        return desires;
    }


private considerAdditionalPickup(
    parcels: Parcel[] | undefined,
    beliefs: BeliefBase,
    carryingParcels: Parcel[]
): Intention | null {
    const reachableParcels = getReachableParcels({ beliefs });

    if (reachableParcels.length === 0) return null;

    const deliverySpot = getNearestDeliverySpot({
        startPosition: beliefs.getBelief("position") as Position,
        beliefs
    });

    if (!deliverySpot) return null;

    const baseDeliveryTime = deliverySpot.time;
    const baseReward = carryingParcels.reduce(
        (acc, p) => acc + p.reward * Math.exp(-baseDeliveryTime / DECAY_INTERVAL),
        0
    );

    let bestParcel: Parcel | null = null;
    let bestGain = -Infinity;

    for (const { parcel, time: fromMeToParcelTime } of reachableParcels) {
        const delivery = getNearestDeliverySpot({
            startPosition: { x: parcel.x, y: parcel.y },
            beliefs
        });
        if (!delivery) continue;

        const totalTime = fromMeToParcelTime + delivery.time;
        const minExpire = this.calculateMinExpirationTime(carryingParcels);
        if (!this.canPickupAdditionalParcel(totalTime, minExpire)) continue;

        const totalReward = [
            ...carryingParcels.map(p => p.reward * Math.exp(-totalTime / DECAY_INTERVAL)),
            parcel.reward * Math.exp(-totalTime / DECAY_INTERVAL)
        ].reduce((a, b) => a + b, 0);

        const gain = totalReward - baseReward;
        if (gain > 0 && gain > bestGain) {
            bestGain = gain;
            bestParcel = parcel;
        }
    }

    return bestParcel
        ? {
              type: desireType.PICKUP,
              possilbeParcels: [bestParcel],
          }
        : null;
}
    /**
     * Evaluates whether to pick up additional parcels while carrying others
     */
    private old_considerAdditionalPickup(parcels: Parcel[] | undefined, beliefs: BeliefBase, carryingParcels: Parcel[]): Intention | null{
        const uncarriedParcels = parcels?.filter(parcel => parcel.carriedBy === null);
        if (!uncarriedParcels || uncarriedParcels.length === 0) return null;

        const nearestParcelResult = getNearestParcel({ beliefs });
        if (!nearestParcelResult) {
            console.log("All paths to parcels are blocked");
            return null;
        }

        const { parcel, time: fromMeToParcelTime } = nearestParcelResult;
        const deliverySpotResult = getNearestDeliverySpot({
            startPosition: { x: parcel.x, y: parcel.y },
            beliefs
        });

        if (!deliverySpotResult) {
            console.log("All paths to delivery are blocked");
            return null;
        }

        const { time: fromParcelToDeliveryTime } = deliverySpotResult;
        const timeForSecondaryPath = fromMeToParcelTime + fromParcelToDeliveryTime;
        const minExpirationTimeInMS = this.calculateMinExpirationTime(carryingParcels);

        if (this.canPickupAdditionalParcel(timeForSecondaryPath, minExpirationTimeInMS)) {
            const { deliverCarrying, pickupAnother } = this.calculateRewards({
                optionalParcel: parcel,
                carryingParcels,
                timeForSecondaryPath,
                beliefs
            });

            if (pickupAnother > deliverCarrying) {
                return {
                    type: desireType.PICKUP,
                    possilbeParcels: [parcel],
                }
            }
        }
        return null;
    }

    /**
     * Calculates rewards for different delivery strategies
     */
    private calculateRewards({ optionalParcel, carryingParcels, timeForSecondaryPath, beliefs }: RewardCalculationParams) {
        const { reward } = optionalParcel;
        const totalRewardAtDeliverySecondaryPath = [
            ...carryingParcels.map(p => p.reward * Math.exp(-timeForSecondaryPath/DECAY_INTERVAL)),
            reward * Math.exp(-timeForSecondaryPath/DECAY_INTERVAL)
        ].reduce((acc, cur) => acc + cur, 0);

        const deliverySpotResult = getNearestDeliverySpot({
            startPosition: beliefs.getBelief("position") as Position,
            beliefs
        });

        if (!deliverySpotResult) {
            return { pickupAnother: totalRewardAtDeliverySecondaryPath, deliverCarrying: -Infinity };
        }

        const { time } = deliverySpotResult;
        const totalRewardAtDeliveryPrimaryPath = carryingParcels
            .map(p => p.reward * Math.exp(-time/DECAY_INTERVAL))
            .reduce((acc, cur) => acc + cur, 0);

        return {
            pickupAnother: totalRewardAtDeliverySecondaryPath,
            deliverCarrying: totalRewardAtDeliveryPrimaryPath
        };
    }

    /**
     * Calculates minimum expiration time for carried parcels
     */
    private calculateMinExpirationTime(carryingParcels: Parcel[]): number {
        return carryingParcels.map(p => p.reward * DECAY_INTERVAL).sort((a, b) => a - b)[0];
    }

    /**
     * Determines if additional parcel pickup is feasible
     */
    private canPickupAdditionalParcel(timeForSecondaryPath: number, minExpirationTimeInMS: number): boolean {
        return timeForSecondaryPath < minExpirationTimeInMS;
    }

  
}

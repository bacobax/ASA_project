import { BeliefBase } from "./beliefs";
import { atomicActions, desireType, Intention, MapConfig, Parcel, Position } from "../types/types";
import { getCenterDirectionTilePosition, timeForPath } from "./utils/desireUtils";

import { EXPLORATION_STEP_TOWARDS_CENTER } from "../config";
import { getOptimalPath } from "./utils/pathfinding";
import { planMultiPickupStrategy } from "./utils/planUtils";

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

export const getReachableParcels = ({ beliefs, filter }: ReachableParcelArgs): Parcel[] => {
    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const curPos = beliefs.getBelief<Position>("position");
    const map = beliefs.getBelief<MapConfig>("map");

    if (!parcels || !curPos || !map) throw new Error("Missing beliefs");

    const uncarried = parcels.filter(p => !p.carriedBy && (!filter || filter(p)));

    const reachable: Parcel[] = [];

    for (const parcel of uncarried) {
        const path = getOptimalPath(curPos, { x: parcel.x, y: parcel.y }, map, beliefs);
        if (!path) continue;

        const time = timeForPath({ path }).time;
        reachable.push(parcel);
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
            const pickup = this.considerAdditionalPickup( beliefs, carryingParcels);
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
        beliefs: BeliefBase,
        carryingParcels: Parcel[]
    ): Intention | null {
        const reachableParcels = getReachableParcels({ beliefs });
        if (reachableParcels.length === 0) return null;
    
        const result = planMultiPickupStrategy(beliefs, carryingParcels, reachableParcels);
        if (!result) return null;
    
        if (result.plan.some(step => step.action === "pickup")) {
            return {
                type: desireType.PICKUP,
                possilbeParcels: result.plan.filter(p => p.action === "pickup").map(p => p.parcel),
            };
        }
    
        return null;
    }
  
}

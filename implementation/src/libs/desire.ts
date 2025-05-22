import { BeliefBase } from "./beliefs";
import { atomicActions, desireType, Intention, MapConfig, Parcel, Position } from "../types/types";
import { getCenterDirectionTilePosition,  getNearestDeliverySpot, selectBestExplorationTile } from "./utils/desireUtils";
import {  EXPLORATION_STEP_TOWARDS_CENTER } from "../config";
import { getConfig, Strategies } from "./utils/common";
import { getDeliverySpot, getMinDistance } from "./utils/mapUtils";
import { rewardNormalizations } from "./utils/planUtils";



export interface ReachableParcel {
    parcel: Parcel;
    time: number;
    distance: number;
}

interface ReachableParcelArgs {
    beliefs: BeliefBase;
    filter?: (parcel: Parcel) => boolean;
}

export const getReachableParcels = ({ beliefs, filter }: ReachableParcelArgs): ReachableParcel[] => {
    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const curPos = beliefs.getBelief<Position>("position");
    const map = beliefs.getBelief<MapConfig>("map");
    const speed = getConfig<number>("MOVEMENT_DURATION");


    if (!parcels || !curPos || !map || !speed) throw new Error("Missing beliefs");

    const uncarried = parcels.filter(p => !p.carriedBy && (!filter || filter(p)));

    const reachable: ReachableParcel[] = [];

    for (const parcel of uncarried) {
        const distance = getMinDistance({
            startPosition: curPos,
            endPosition: { x: parcel.x, y: parcel.y },
            beliefs,
        });

        const time = distance * speed;
        reachable.push({ parcel, time, distance });
    }

    return reachable;
};



const gainFromReachableParcel =(
        baseReward: number, 
        baseDistance:number, 
        beliefs: BeliefBase, 
        MOVEMENT_DURATION: number, 
        DECAY_INTERVAL: number, 
        carryingParcels: Parcel[]) => ({ parcel, time: fromMeToParcelTime , distance: fromMeToParcelDistance }: ReachableParcel) => {
                const delivery = getNearestDeliverySpot({
                    startPosition: { x: parcel.x, y: parcel.y },
                    beliefs
                });

                const deliverytime = delivery.distance * MOVEMENT_DURATION
                const totalTime = fromMeToParcelTime + deliverytime;
                const totalDistance = fromMeToParcelDistance + delivery.distance;

                const totalReward = [
                    ...carryingParcels.map(p => Math.max(0, p.reward - Math.floor(totalTime / DECAY_INTERVAL))),
                    Math.max(0, baseReward - Math.floor(totalTime / DECAY_INTERVAL))
                ].reduce((a, b) => a + b, 0);
                
                // console.log("Parcel:", parcel.id,"Reward:", parcel.reward, "Total Reward:", totalReward, "fromMeToParcelTime:", fromMeToParcelTime, "deliveryTime:", deliverytime, "totalTime:", totalTime);

                const strategy = beliefs.getBelief<Strategies>("strategy")!;
                const normalizedTotalReward = rewardNormalizations[strategy](totalReward, totalDistance);
                const normalizedBaseReward = rewardNormalizations[strategy](baseReward, baseDistance);

                return normalizedTotalReward - normalizedBaseReward;
            }

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
            const additionalPickup = this.considerAdditionalPickup(parcels, beliefs, carryingParcels);
            if (additionalPickup) desires.push(additionalPickup)
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

        let tileToExplore = selectBestExplorationTile(beliefs, curPos);
        if (!tileToExplore) {
            tileToExplore = getDeliverySpot(curPos, 3, beliefs).position;
        }
        
        desires.push({
            type: desireType.MOVE,
            position: tileToExplore
        });
        return desires;
    }


    private considerAdditionalPickup(
        parcels: Parcel[] | undefined,
        beliefs: BeliefBase,
        carryingParcels: Parcel[]
    ): Intention | null {
        const reachableParcels = getReachableParcels({ beliefs });
        const DECAY_INTERVAL = getConfig<number>("PARCEL_DECADING_INTERVAL");
        const MOVEMENT_DURATION = getConfig<number>("MOVEMENT_DURATION");

        if (!DECAY_INTERVAL || ! MOVEMENT_DURATION) return null;

        if (reachableParcels.length === 0) return null;

        const deliverySpot = getNearestDeliverySpot({
            startPosition: beliefs.getBelief("position") as Position,
            beliefs,
        });



        const baseDeliveryTime = deliverySpot.distance * MOVEMENT_DURATION;
        const baseDistance = deliverySpot.distance; // Assuming this is the distance from the current position to the delivery spo

        const baseReward = carryingParcels.reduce(
            (acc, p) => acc + Math.max(0, p.reward - Math.floor(baseDeliveryTime / DECAY_INTERVAL)),
            0
        );

        let bestParcel: Parcel | null = null;
        let bestGain = -Infinity;
        console.log("Base reward:", baseReward);

        const gainFunction = gainFromReachableParcel(
            baseReward,
            baseDistance,
            beliefs,
            MOVEMENT_DURATION,
            DECAY_INTERVAL,
            carryingParcels
        )

        for (const reachableParcel of reachableParcels) {
           
            const gain = gainFunction(reachableParcel);

            if (gain > 0 && gain > bestGain) {
                bestGain = gain;
                bestParcel = reachableParcel.parcel;
            }
           
        }
        const possileParcels = reachableParcels.filter(RP => gainFunction(RP)>0).map(RP => RP.parcel);
        
        return bestParcel
            ? {
                type: desireType.PICKUP,
                possilbeParcels: possileParcels,
            }
            : null;
    }
    
    

    

  
}

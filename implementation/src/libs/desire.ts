import { BeliefBase } from "./beliefs";
import { desireType, Intention, Parcel, Position } from "../types/types";
import {
    considerAdditionalPickup,
    selectBestExplorationTile,
} from "./utils/desireUtils";
import { getDeliverySpot } from "./utils/mapUtils";

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

        desires.concat(this.generateDesiresPickupDeliver(beliefs));
        
        desires.concat(this.generateDesiresMove(beliefs));

        return desires;
    }

    private generateDesiresPickupDeliver(beliefs: BeliefBase): Intention[] {
        const desires: Intention[] = [];
        const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
        const carryingParcels =
            parcels?.filter(
                (p) => p.carriedBy === beliefs.getBelief<string>("id")
            ) ?? [];
        const curPos: Position = beliefs.getBelief("position") as Position;
        const isCollaborating = beliefs.getBelief<boolean>("isCollaborating");
        const role = beliefs.getBelief<string>("role");

        if (carryingParcels.length > 0) {
            if (role != "courier") {
                // Try to pick up more if possible
                const additionalPickup = considerAdditionalPickup(
                    beliefs,
                    isCollaborating
                );

                if (additionalPickup) desires.push(additionalPickup);
            }
            switch (role) {
                case "explorer":
                    desires.push({
                        type: desireType.EXPLORER_DELIVER, //deliver to midpoint
                    });
                    break;
                case "courier":
                    desires.push({
                        type: desireType.COURIER_DELIVER, //deliver to nearest delivery spot
                    });
                    break;
                default:
                    desires.push({
                        type: desireType.DELIVER,
                    });
                    break;
            }

            // Deliver what you're carrying
            //desires.push({ type: desireType.DELIVER });
        } else if (parcels && parcels.length > 0) {
            // Attempt pickup of available parcels
            const pickupCandidates = parcels.filter(
                (p) =>
                    p.carriedBy === null && p.x !== curPos.x && p.y !== curPos.y
            );
            if (pickupCandidates.length > 0) {
                switch (role) {
                    case "explorer":
                        desires.push({
                            type: desireType.EXPLORER_PICKUP,
                            possilbeParcels: pickupCandidates,
                        });
                        break;
                    case "courier":
                        desires.push({
                            type: desireType.COURIER_PICKUP,
                            possilbeParcels: pickupCandidates,
                        });
                        break;
                    default:
                        desires.push({
                            type: desireType.PICKUP,
                            possilbeParcels: pickupCandidates,
                        });
                        break;
                }
            }
        }
        return desires;
    }

    private generateDesiresMove(beliefs: BeliefBase): Intention[] {
        const desires: Intention[] = [];
        const curPos: Position = beliefs.getBelief("position") as Position;
        const role = beliefs.getBelief<string>("role");

        if (role === "explorer") {
            let tileToExplore = selectBestExplorationTile(beliefs, curPos);
            if (!tileToExplore) {
                tileToExplore = getDeliverySpot(curPos, 3, beliefs).position;
            }

            desires.push({
                type: desireType.EXPLORER_MOVE,
                position: tileToExplore,
            });
        } else if (role === "courier") {
            // Move towards the nearest delivery spot
            desires.push({
                type: desireType.COURIER_MOVE,
            });
        } else {
            let tileToExplore = selectBestExplorationTile(beliefs, curPos);
            if (!tileToExplore) {
                tileToExplore = getDeliverySpot(curPos, 3, beliefs).position;
            }
            desires.push({
                type: desireType.MOVE,
                position: tileToExplore,
            });
        }

        return desires;
    }
}

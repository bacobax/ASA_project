import { BeliefBase } from "./beliefs";
import { desireType, Intention, Parcel, Position } from "../types/types";
import {
    considerAdditionalPickup,
    selectBestExplorationTile,
} from "./utils/desireUtils";
import {
    getDeliverySpot,
    getSpawnableSpot,
    manhattanDistance,
} from "./utils/mapUtils";

/**
 * Generates agent desires based on its beliefs and role.
 * This includes parcel delivery, pickup, and movement decisions.
 */
export class DesireGenerator {
    /**
     * Generates all possible desires based on the agent's current belief base.
     * @param beliefs Current belief base of the agent.
     * @returns Array of intentions representing the agent's desires.
     */
    generateDesires(beliefs: BeliefBase): Intention[] {
        // console.log("-----Generating Desire Options-----");
        const desires: Intention[] = [];

        desires.push(...this.generateDesiresPickupDeliver(beliefs));
        desires.push(...this.generateDesiresMove(beliefs));

        return desires;
    }

    /**
     * Returns true if the agent is carrying any parcels.
     */
    private isCarryingParcels(beliefs: BeliefBase): boolean {
        const parcels = beliefs.getBelief<Parcel[]>("visibleParcels") ?? [];
        const agentId = beliefs.getBelief<string>("id");
        return parcels.some(p => p.carriedBy === agentId);
    }

    private generateDesiresPickupDeliver(beliefs: BeliefBase): Intention[] {
        if (this.isCarryingParcels(beliefs)) {
            return this.generateDeliveryDesires(beliefs);
        } else {
            return this.generatePickupDesires(beliefs);
        }
    }

    /**
     * Generates delivery-related desires based on the agent's role and potential for extra pickup.
     */
    private generateDeliveryDesires(beliefs: BeliefBase): Intention[] {
        const desires: Intention[] = [];
        const isCollaborating = beliefs.getBelief<boolean>("isCollaborating");
        const role = beliefs.getBelief<string>("role");

        const additionalPickup = considerAdditionalPickup(beliefs, isCollaborating);
        if (additionalPickup) desires.push(additionalPickup);

        switch (role) {
            case "explorer":
                desires.push({ type: desireType.EXPLORER_DELIVER });
                break;
            case "courier":
                desires.push({ type: desireType.COURIER_DELIVER });
                break;
            default:
                desires.push({ type: desireType.DELIVER });
                break;
        }

        return desires;
    }

    /**
     * Generates pickup desires for unclaimed parcels based on agent role.
     */
    private generatePickupDesires(beliefs: BeliefBase): Intention[] {
        const desires: Intention[] = [];
        const parcels = beliefs.getBelief<Parcel[]>("visibleParcels") ?? [];
        const bookedParcels = beliefs.getBelief<Parcel[]>("parcelsBookedByTeammates") || [];
        const pickupCandidates = parcels.filter(p => p.carriedBy === null && !bookedParcels.some(bp => bp.id === p.id));
        const role = beliefs.getBelief<string>("role");

        if (pickupCandidates.length === 0) return desires;

        switch (role) {
            case "explorer":
                const midpoint = beliefs.getBelief<Position>("midpoint") as Position;
                const filtered = pickupCandidates.filter(p => manhattanDistance(p, midpoint) > 2);
                if (filtered.length > 0) {
                    desires.push({ type: desireType.EXPLORER_PICKUP, possibleParcels: filtered });
                }
                break;
            case "courier":
                desires.push({ type: desireType.COURIER_PICKUP, possibleParcels: pickupCandidates });
                break;
            default:
                desires.push({ type: desireType.PICKUP, possibleParcels: pickupCandidates });
                break;
        }

        return desires;
    }

    /**
     * Generates movement-related desires based on agent's role and environment.
     */
    private generateDesiresMove(beliefs: BeliefBase): Intention[] {
        const desires: Intention[] = [];
        const curPos: Position = beliefs.getBelief("position") as Position;
        const role = beliefs.getBelief<string>("role");

        if (role === "explorer") {
            let tileToExplore = selectBestExplorationTile(beliefs, curPos);
            if (!tileToExplore) {
                tileToExplore = getSpawnableSpot(curPos, 0, beliefs).position;
            }

            desires.push({
                type: desireType.EXPLORER_MOVE,
                details: {
                    targetPosition: tileToExplore,
                },
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
                if (!tileToExplore) {
                    tileToExplore = getSpawnableSpot(
                        curPos,
                        0,
                        beliefs
                    ).position;
                }
            }
            desires.push({
                type: desireType.MOVE,
                details: {
                    targetPosition: tileToExplore,
                },
            });
        }

        return desires;
    }
}

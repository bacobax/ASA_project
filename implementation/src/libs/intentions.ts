import { BeliefBase } from "./beliefs";
import { desireType, Intention, Parcel, Position } from "../types/types";
import { getConfig } from "./utils/common";
import { manhattanDistance } from "./utils/mapUtils";

export class IntentionManager {
    private activeIntention: Intention | null = null;
    private archivedIntentions: Intention[] = [];
    private teamDesireTypes: desireType[] = [desireType.EXPLORER_DELIVER, desireType.COURIER_DELIVER, desireType.EXPLORER_PICKUP, desireType.COURIER_PICKUP, desireType.EXPLORER_MOVE, desireType.COURIER_MOVE, desireType.EXPLORER_DELIVER_ON_PATH];
    
    adoptIntention(intention: Intention): void {
        if (
            this.activeIntention &&
            this.areIntentionsEqual(this.activeIntention, intention)
        ) {
            return; // No need to adopt again
        }
        this.activeIntention = intention;
    }

    dropCurrentIntention(): void {
        if (this.activeIntention) {
            this.archivedIntentions.push(this.activeIntention);
            this.activeIntention = null;
        }
    }

    reviseIntentions(beliefs: BeliefBase): void {
        if (!this.activeIntention) return;

        const intention = this.activeIntention;

        const role = beliefs.getBelief<string>("role");
        if (role == null && this.teamDesireTypes.includes(intention.type)) {
            // If the role is not set, we cannot handle team intentions
            this.dropCurrentIntention();
            return;
        }

        if (
            intention.type === desireType.PICKUP ||
            intention.type === desireType.EXPLORER_PICKUP ||
            intention.type === desireType.COURIER_PICKUP
        ) {
            const curPos = beliefs.getBelief<Position>("position");
            const visibleParcels =
                beliefs.getBelief<Parcel[]>("visibleParcels") ?? [];
            const possibleParcels = intention.details?.parcelsToPickup;
            const visionRange = getConfig<number>(
                "AGENTS_OBSERVATION_DISTANCE"
            )!;

            if (
                possibleParcels?.some((parcel) => {
                    const isWithinVision =
                        curPos &&
                        manhattanDistance(parcel,curPos) <= visionRange;
            
                    // Try to find the parcel in the current visible parcels
                    const seenParcel = visibleParcels.find((p) => p.id === parcel.id);
            
                    // If it's within vision but not seen, it's missing
                    const isMissingInVision = isWithinVision && !seenParcel;
            
                    // If it's seen and carried by someone 
                    const isCarried = seenParcel && seenParcel.carriedBy !== null;
            
                    return isCarried || isMissingInVision;
                })
            ) {
                this.dropCurrentIntention();
                return;
            }
        }

        if (
            intention.type === desireType.DELIVER ||
            intention.type === desireType.EXPLORER_DELIVER ||
            intention.type === desireType.COURIER_DELIVER ||
            intention.type === desireType.EXPLORER_DELIVER_ON_PATH
        ) {
            const parcels = beliefs.getBelief<Parcel[]>("visibleParcels") ?? [];
            const carried = parcels.filter(
                (p) =>
                    p.carriedBy === beliefs.getBelief<string>("id")
            );
            if (carried.length === 0) {
                this.dropCurrentIntention();
                return;
            }
        }

        if (
            intention.type === desireType.MOVE ||
            intention.type === desireType.EXPLORER_MOVE
        ) {
            const visibleParcels = beliefs
                .getBelief<Parcel[]>("visibleParcels")
                ?.filter((p) => p.carriedBy == null);
            if (visibleParcels?.length && visibleParcels.length > 0) {
                this.dropCurrentIntention();
                return;
            }

            const pos = beliefs.getBelief("position") as Position;
            if (
                intention.details?.targetPosition &&
                pos.x === intention.details?.targetPosition.x &&
                pos.y === intention.details?.targetPosition.y
            ) {
                this.dropCurrentIntention();
                return;
            }
        }
    }

    getCurrentIntention(): Intention | null {
        return this.activeIntention;
    }

    hasIntentions(): boolean {
        return this.activeIntention !== null;
    }

    private areIntentionsEqual(a: Intention, b: Intention): boolean {
        return JSON.stringify(a) === JSON.stringify(b); // structural equality
    }
}

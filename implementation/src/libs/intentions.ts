import { BeliefBase } from "./beliefs";
import { desireType, Intention, Parcel, Position } from "../types/types";
import { getConfig } from "./utils/common";

export class IntentionManager {
    private activeIntention: Intention | null = null;
    private archivedIntentions: Intention[] = [];

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

        if (
            intention.type === desireType.PICKUP ||
            intention.type === desireType.EXPLORER_PICKUP ||
            intention.type === desireType.COURIER_PICKUP
        ) {
            const agentId = beliefs.getBelief<string>("id");
            const agentPosition = beliefs.getBelief<Position>("position");
            const visibleParcels =
                beliefs.getBelief<Parcel[]>("visibleParcels") ?? [];
            const possibleParcels = intention.details?.parcelsToPickup;
            const visionRange = getConfig<number>(
                "AGENTS_OBSERVATION_DISTANCE"
            )!;

            if (
                possibleParcels?.some((parcel) => {
                    const isCarriedByOther =
                        parcel.carriedBy !== null &&
                        parcel.carriedBy !== agentId;

                    const isWithinVision =
                        agentPosition &&
                        Math.hypot(
                            parcel.x - agentPosition.x,
                            parcel.y - agentPosition.y
                        ) <= visionRange;

                    const isMissingInVision =
                        isWithinVision &&
                        !visibleParcels.some((p) => p.id === parcel.id);

                    return isCarriedByOther || isMissingInVision;
                })
            ) {
                this.dropCurrentIntention();
            }
        }

        if (
            intention.type === desireType.DELIVER ||
            intention.type === desireType.EXPLORER_DELIVER ||
            intention.type === desireType.COURIER_DELIVER ||
            intention.type === desireType.EXPLORER_DELIVER_ON_PATH
        ) {
            const carried =
                beliefs.getBelief<string[]>("carryingParcels") || [];
            if (carried.length === 0) {
                this.dropCurrentIntention();
            }
        }

        if (
            intention.type === desireType.MOVE ||
            intention.type === desireType.EXPLORER_MOVE ||
            intention.type === desireType.COURIER_MOVE
        ) {
            const visibleParcels = beliefs
                .getBelief<Parcel[]>("visibleParcels")
                ?.filter((p) => p.carriedBy == null);
            if (visibleParcels?.length && visibleParcels.length > 0) {
                this.dropCurrentIntention();
            }

            const pos = beliefs.getBelief("position") as Position;
            if (
                intention.details?.targetPosition &&
                pos.x === intention.details?.targetPosition.x &&
                pos.y === intention.details?.targetPosition.y
            ) {
                this.dropCurrentIntention();
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

import { BeliefBase } from "./beliefs";
import { desireType, Intention, Parcel, Position } from "../types/types";

export class IntentionManager {
    private activeIntention: Intention | null = null;
    private archivedIntentions: Intention[] = [];

    adoptIntention(intention: Intention): void {
        if (this.activeIntention && this.areIntentionsEqual(this.activeIntention, intention)) {
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

        if (intention.type === desireType.PICKUP) {
            const visibleParcels = beliefs.getBelief<Parcel[]>("visibleParcels")?.filter(p => p.carriedBy == null);
            if (!visibleParcels?.some(p => p.id === intention.parcelId)) {
                this.dropCurrentIntention();
            }
        }

        if (intention.type === desireType.DELIVER) {
            const parcels = beliefs.getBelief<Parcel[]>("visibleParcels") ?? [];
            const carried = parcels.filter(
                (p) =>
                    p.carriedBy === beliefs.getBelief<string>("id")
            );
            if (carried.length === 0) {
                this.dropCurrentIntention();
            }
        }

        if (intention.type === desireType.MOVE) {
            const visibleParcels = beliefs.getBelief<Parcel[]>("visibleParcels")?.filter(p => p.carriedBy == null);
            if (visibleParcels?.length && visibleParcels.length > 0) {
                this.dropCurrentIntention();
            }

            const pos = beliefs.getBelief("position") as Position;
            if (intention.position && pos.x === intention.position.x && pos.y === intention.position.y) {
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
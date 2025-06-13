import { BeliefBase } from "./beliefs";
import { desireType, Intention, Parcel, Position } from "../types/types";
import { getConfig } from "./utils/common";
import { manhattanDistance } from "./utils/mapUtils";

export class IntentionManager {
    private activeIntention: Intention | null = null;
    private archivedIntentions: Intention[] = [];
    private teamDesireTypes: desireType[] = [desireType.EXPLORER_DELIVER, desireType.COURIER_DELIVER, desireType.EXPLORER_PICKUP, desireType.COURIER_PICKUP, desireType.EXPLORER_MOVE, desireType.COURIER_MOVE, desireType.EXPLORER_DELIVER_ON_PATH];
    
    /**
     * Sets the current active intention unless it's already the same as the current one.
     * @param intention The intention to adopt as active.
     */
    adoptIntention(intention: Intention): void {
        if (
            this.activeIntention &&
            this.areIntentionsEqual(this.activeIntention, intention)
        ) {
            return; // No need to adopt again
        }
        this.activeIntention = intention;
    }

    /**
     * Archives the current active intention and clears it.
     */
    dropCurrentIntention(): void {
        if (this.activeIntention) {
            this.archivedIntentions.push(this.activeIntention);
            this.activeIntention = null;
        }
    }

    /**
     * Revises the current active intention based on the agent's beliefs.
     * Decides whether to drop the intention if conditions indicate it is no longer valid.
     * This includes checking role availability for team intentions, parcel visibility and status,
     * and position relative to target locations.
     * @param beliefs The current belief base of the agent.
     */
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

    /**
     * Returns the current active intention.
     * @returns The active Intention or null if none is active.
     */
    getCurrentIntention(): Intention | null {
        return this.activeIntention;
    }

    /**
     * Returns true if there is an active intention.
     * @returns boolean indicating presence of an active intention.
     */
    hasIntentions(): boolean {
        return this.activeIntention !== null;
    }

    /**
     * Checks structural equality between two intentions.
     * @param a First intention.
     * @param b Second intention.
     * @returns True if intentions are structurally equal, false otherwise.
     */
    private areIntentionsEqual(a: Intention, b: Intention): boolean {
        return JSON.stringify(a) === JSON.stringify(b); // structural equality
    }
}

import { BeliefBase } from "./beliefs";
import { Intention, Parcel, Position } from "../types/types";

export class IntentionManager {
    private intentions: Intention[] = [];

    adoptIntention(intention: Intention): void {
        this.intentions.push(intention);
    }

    dropIntention(intention: Intention): void {
        this.intentions = this.intentions.filter(i => i !== intention);
    }

    reviseIntentions(beliefs: BeliefBase): void {
        // console.log("Revision");
        this.intentions = this.intentions.filter(intention => {
            if (intention.type === "pickup") {
                const visibleParcels = beliefs.getBelief<Parcel[]>("visibleParcels")?.filter(p => p.carriedBy == null);
                return visibleParcels?.some(p => p.id === intention.parcelId);
            }
            if (intention.type === "deliver") {
                return beliefs.hasBelief("carryingParcels") && beliefs.getBelief<string[]>("carryingParcels")!.length > 0;
            }
            if (intention.type === "move") {
                const visibleParcels = beliefs.getBelief<Parcel[]>("visibleParcels")?.filter(p => p.carriedBy == null);
                if(visibleParcels?.length !== undefined && visibleParcels?.length>0){
                    // console.log("there are visible parcels")
                    return false;
                }
                const destination = beliefs.getBelief("position") as Position;
                if(intention.position){
                    if(destination.x == intention.position.x && destination.y == intention.position.y){
                        // console.log("removing move");
                        return false;
                    }
                }
            }
            return true;
        });
    }

    getCurrentIntention(): Intention | null {
        return this.intentions.length > 0 ? this.intentions[0] : null;
    }

    hasIntentions(): boolean {
        return this.intentions.length > 0;
    }
}
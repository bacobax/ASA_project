import { BeliefBase } from "./beliefs";
import { Intention, Parcel } from "./types/types";

export class DesireGenerator {
    generateDesires(beliefs: BeliefBase): Intention[] {
        let desires: Intention[] = [];

        const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
        if (parcels) {
            for (let parcel of parcels) {
                console.log("Desire pushed - pickup:", parcel);
                desires.push({ type: "pickup", parcelId: parcel.id, x: parcel.x, y: parcel.y });
            }
        }

        const carryingParcels = beliefs.getBelief<string[]>("carryingParcels");
        if (carryingParcels && carryingParcels.length > 0) {
            console.log("Desire pushed - deliver");
            desires.push({ type: "deliver" });
        }

        return desires;
    }
}
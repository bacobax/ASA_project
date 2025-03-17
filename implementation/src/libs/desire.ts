import { BeliefBase } from "./beliefs";
import { Intention, Parcel, MapTile, Position, MapConfig } from "../types/types";
import { getTileIndex, getDeliverySpot } from "./utils";

export class DesireGenerator {
    generateDesires(beliefs: BeliefBase): Intention[] {
        let desires: Intention[] = [];

        const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
        if (parcels) {
            for (let parcel of parcels) {
                console.log("Desire pushed - pickup:", parcel);
                desires.push({ type: "pickup", parcelId: parcel.id, position: {x:parcel.x, y:parcel.y}});
            }
        }

        const carryingParcels = parcels?.filter(parcel => parcel.carriedBy == beliefs.getBelief("id"));
        if (carryingParcels && carryingParcels.length > 0) {
            console.log("Desire pushed - deliver");
            desires.push({ type: "deliver" });
        }

        if(desires.length==0){
            console.log("Desire pushed - move");
            desires.push({type: "move"})
        }

        return desires;
    }
}
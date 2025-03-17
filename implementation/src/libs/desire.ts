import { BeliefBase } from "./beliefs";
import { Intention, Parcel, MapTile, Position, MapConfig } from "../types/types";
import { getTileIndex } from "./utils";

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

        const carryingParcels = beliefs.getBelief<string[]>("carryingParcels");
        if (carryingParcels && carryingParcels.length > 0) {
            console.log("Desire pushed - deliver");
            desires.push({ type: "deliver" });
        }

        if(desires.length==0){
            const deliveries:MapTile[] = beliefs.getBelief("deliveries") as MapTile[];
            const curPos: Position = beliefs.getBelief("position") as Position;
            const distances: number[][] = beliefs.getBelief("dist") as number[][];
            const map: MapConfig = beliefs.getBelief("map") as MapConfig;
            let minDistance:number = Infinity;
            for (let i = 0; i < deliveries.length; i++) {
                
                const dist = distances[getTileIndex(curPos, map.width)][getTileIndex({x:deliveries[i].x, y:deliveries[i].y}, map.width)];
                if(dist > 3 && dist < minDistance){
                    minDistance = dist;
                }
            }
        }

        return desires;
    }
}
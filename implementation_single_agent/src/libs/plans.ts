import { Intention, atomicActions, Position, MapConfig, desireType, Parcel } from "../types/types";
import { BeliefBase } from "./beliefs";
import { Strategies } from "./utils/common";
import { getDeliverySpot } from "./utils/mapUtils";
import { convertPathToActions, getOptimalPath, getVisitedTilesFromPlan } from "./utils/pathfinding";
import { parcelsCompare } from "./utils/planUtils";

export function handlePickup(intention: Intention, beliefs: BeliefBase): {intention: Intention, path: atomicActions[]} {
    const curPos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map")!;
    const strategy = beliefs.getBelief<Strategies>("strategy")!;

    if (!intention.possilbeParcels || intention.possilbeParcels.length === 0) {
        console.error("No parcels available for pickup");
        return {path:[], intention: intention};
    }

    const sorted = intention.possilbeParcels
        .map(p => {
            const tilesOnPath = getOptimalPath(curPos, { x: p.x, y: p.y }, map, beliefs);
            const path = convertPathToActions(tilesOnPath);
            
            return {
                ...p,
                distance: path ? path.length : Infinity,
                path: path ?? null,
                tilesOnPath: tilesOnPath,
            };
        })
        .sort(parcelsCompare(strategy));

    const bestPlanParcel = sorted[0];
    const bestPlan = bestPlanParcel.path;

    if (!bestPlan) {
        console.error("Error in pathfinding");
        return {path:[], intention: intention};
    }

    // console.log("Best plan", bestPlan);


    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const carryingParcels = parcels?.filter(p => p.carriedBy === beliefs.getBelief<string>("id")) ?? [];

    if (carryingParcels.length > 0) {
        const tilesToVisit = bestPlanParcel.tilesOnPath;
        for(let i = 0; i < tilesToVisit.length; i++){
            const tile = tilesToVisit[i];
            if(tile.type == 2){
                const path = bestPlan.slice(0, i);
                path.push(atomicActions.drop);
                const intention = {
                    type: desireType.DELIVER,
                    position: {x: tile.x, y: tile.y}
                }

                return {path:path, intention:intention}
            }
        }
        
        
    }
        

    bestPlan.push(atomicActions.pickup);
    return {path:bestPlan, intention: intention};
}

export function handleDeliver(intention: Intention, beliefs: BeliefBase): {intention: Intention, path: atomicActions[]} {
    const curPos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map")!;
    const deliveryPos = getDeliverySpot(curPos, 0, beliefs);
    console.log("Delivery pos", deliveryPos.position);
    const path = convertPathToActions(getOptimalPath(curPos, deliveryPos.position, map, beliefs));
    if (!path) {
        console.error("Error in pathfinding");
        return {path:[], intention: intention};
    }

    path.push(atomicActions.drop);
    return {path:path, intention: intention};
}

export function handleMove(intention: Intention, beliefs: BeliefBase): {intention: Intention, path: atomicActions[]} {
    const curPos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map")!;

    if (
        intention.position &&
        (intention.position.x !== curPos.x || intention.position.y !== curPos.y)
    ) {
        const path = convertPathToActions(getOptimalPath(curPos, intention.position, map, beliefs));
        if (!path) {
            console.error("Error in pathfinding");
            return {path:[], intention: intention};
        }
        return {path:path, intention: intention};
    }

    return {path:[], intention: intention};
}


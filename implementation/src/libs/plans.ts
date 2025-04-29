import { Intention, atomicActions, Position, MapConfig, desireType } from "../types/types";
import { BeliefBase } from "./beliefs";
import { getDeliverySpot } from "./utils/mapUtils";
import { getOptimalPath } from "./utils/pathfinding";
import { parcelsCompare } from "./utils/planUtils";

export function handlePickup(intention: Intention, beliefs: BeliefBase): atomicActions[] {
    const curPos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map")!;

    if (!intention.possilbeParcels || intention.possilbeParcels.length === 0) {
        console.error("No parcels available for pickup");
        return [];
    }

    const sorted = intention.possilbeParcels
        .map(p => {
            const path = getOptimalPath(curPos, { x: p.x, y: p.y }, map, beliefs);
            return {
                ...p,
                distance: path ? path.length : Infinity,
                path: path ?? null,
            };
        })
        .sort(parcelsCompare);

    const bestPath = sorted[0]?.path;
    if (!bestPath) {
        console.error("Error in pathfinding");
        return [];
    }

    bestPath.push(atomicActions.pickup);
    return bestPath;
}

export function handleDeliver(intention: Intention, beliefs: BeliefBase): atomicActions[] {
    const curPos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map")!;
    const deliveryPos = getDeliverySpot(curPos, 0, beliefs);

    const path = getOptimalPath(curPos, deliveryPos.position, map, beliefs);
    if (!path) {
        console.error("Error in pathfinding");
        return [];
    }

    path.push(atomicActions.drop);
    return path;
}

export function handleMove(intention: Intention, beliefs: BeliefBase): atomicActions[] {
    const curPos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map")!;

    if (
        intention.position &&
        (intention.position.x !== curPos.x || intention.position.y !== curPos.y)
    ) {
        const path = getOptimalPath(curPos, intention.position, map, beliefs);
        if (!path) {
            console.error("Error in pathfinding");
            return [];
        }
        return path;
    }

    return [];
}


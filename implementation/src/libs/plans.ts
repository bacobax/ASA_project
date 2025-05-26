import {
    Intention,
    atomicActions,
    Position,
    MapConfig,
    desireType,
    Parcel,
} from "../types/types";
import { BeliefBase } from "./beliefs";
import { Strategies } from "./utils/common";
import { getNearestDeliverySpot } from "./utils/desireUtils";
import {
    getDeliverySpot,
    getNearestTile,
    ManhattanDistance,
} from "./utils/mapUtils";
import {
    convertPathToActions,
    getOptimalPath,
    getVisitedTilesFromPlan,
} from "./utils/pathfinding";
import { isTeammateAtPosition, parcelsCompare } from "./utils/planUtils";

export function handlePickup(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map")!;
    const strategy = beliefs.getBelief<Strategies>("strategy")!;

    if (!intention.possilbeParcels || intention.possilbeParcels.length === 0) {
        console.error("No parcels available for pickup");
        return { path: [], intention: intention };
    }

    const sorted = intention.possilbeParcels
        .map((p) => {
            const tilesOnPath = getOptimalPath(
                curPos,
                { x: p.x, y: p.y },
                beliefs
            );
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
        return { path: [], intention: intention };
    }

    // console.log("Best plan", bestPlan);

    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const carryingParcels =
        parcels?.filter(
            (p) => p.carriedBy === beliefs.getBelief<string>("id")
        ) ?? [];

    if (carryingParcels.length > 0) {
        const tilesToVisit = bestPlanParcel.tilesOnPath;
        for (let i = 0; i < tilesToVisit.length; i++) {
            const tile = tilesToVisit[i];
            if (tile.type == 2) {
                const path = bestPlan.slice(0, i);
                path.push(atomicActions.drop);
                const intention = {
                    type: desireType.DELIVER,
                    position: { x: tile.x, y: tile.y },
                };

                return { path: path, intention: intention };
            }
        }
    }

    bestPlan.push(atomicActions.pickup);
    return { path: bestPlan, intention: intention };
}

export function handleDeliver(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map")!;
    const deliveryPos = getDeliverySpot(curPos, 0, beliefs);
    console.log("Delivery pos", deliveryPos.position);
    const path = convertPathToActions(
        getOptimalPath(curPos, deliveryPos.position, beliefs)
    );
    if (!path) {
        console.error("Error in pathfinding");
        return { path: [], intention: intention };
    }

    path.push(atomicActions.drop);
    return { path: path, intention: intention };
}

export function handleMove(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map")!;

    if (
        intention.position &&
        (intention.position.x !== curPos.x || intention.position.y !== curPos.y)
    ) {
        const path = convertPathToActions(
            getOptimalPath(curPos, intention.position, beliefs)
        );
        if (!path) {
            console.error("Error in pathfinding");
            return { path: [], intention: intention };
        }
        return { path: path, intention: intention };
    }

    return { path: [], intention: intention };
}

export function handleCourierMove(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;
    return { path: [], intention: intention };
}

export function handleCourierPickup(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;
    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");

    return { path: [], intention: intention };
}

export function handleCourierDeliver(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    return { intention: intention, path: [] };
}

export function handleExplorerMove(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;

    return { path: [], intention: intention };
}

export function handleExplorerPickup(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;
    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const carryingParcels =
        parcels?.filter(
            (p) => p.carriedBy === beliefs.getBelief<string>("id")
        ) ?? [];

    if (carryingParcels.length > 0) {
    }

    return { path: [], intention: intention };
}

export function handleExplorerDeliver(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;
    const midpoint = beliefs.getBelief<Position>("midpoint")!;
    if (ManhattanDistance(curPos, midpoint) == 1) {
        if (isTeammateAtPosition(midpoint, beliefs)) {
            // If a teammate is at the midpoint, drop the parcels
            const parcelsCarried =
                beliefs.getBelief<Parcel[]>("parcelsCarried") || [];
            if (parcelsCarried.length > 0) {
                return { path: [atomicActions.drop], intention: intention };
            } else {
                // If no parcels
                return { path: [], intention: intention };
            }
        } else {
            return { path: [atomicActions.wait], intention: intention };
        }
    } else {
        const deliveryPos = getNearestTile(midpoint, curPos, beliefs);
        const path = convertPathToActions(
            getOptimalPath(curPos, deliveryPos, beliefs)
        );
        if (!path) {
            console.error("Error in pathfinding");
            return { path: [], intention: intention };
        }
        return { path: path, intention: intention };
    }
}

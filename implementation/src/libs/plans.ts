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
import { getDeliverySpot } from "./utils/mapUtils";
import {
    convertPathToActions,
    getOptimalPath,
    getVisitedTilesFromPlan,
} from "./utils/pathfinding";
import { parcelsCompare } from "./utils/planUtils";

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
    const deliveryPos = beliefs.getBelief<Position>("midpoint")!;
    const path = convertPathToActions(
        getOptimalPath(curPos, deliveryPos, beliefs)
    );
    if (!path) {
        console.error("Error in pathfinding");
        return { path: [], intention: intention };
    }

    path.push(atomicActions.drop);
    return { path: path, intention: intention };
}

// export function handleDeliverTeam(
//     intention: Intention,
//     beliefs: BeliefBase
// ): { intention: Intention; path: atomicActions[] } {
//     const midpoint = beliefs.getBelief<Position>("midpoint") as Position;

//     // Check if the agent is already at the midpoint
//     const myPosition = beliefs.getBelief<Position>("position") as Position;
//     if (myPosition && myPosition.x === midpoint.x && myPosition.y === midpoint.y) {
//         // If at midpoint, wait until the explorer drops the parcels
//         const parcelsAtMidpoint = beliefs.getBelief<Parcel[]>("parcelsAtMidpoint") || [];

//         if (parcelsAtMidpoint.length > 0) {
//             // If parcels are at midpoint, pick them up and head to the delivery spot
//             const deliverySpot = getNearestDeliverySpot({startPosition:myPosition, beliefs:beliefs});
//             const pathToDelivery = convertPathToActions(getOptimalPath(midpoint, deliverySpot.position, beliefs));
//             const deliverIntent: Intention = { type: desireType.DELIVER };
//             return {
//                 intention: deliverIntent,
//                 path: [...pathToDelivery, atomicActions.drop],
//             };
//         } else {
//             // If no parcels, wait at midpoint
//             return { intention: { type: desireType.MOVE, position: midpoint }, path: [atomicActions.wait] };
//         }
//     } else {
//         // If not at midpoint, go to midpoint
//         const pathToMidpoint = convertPathToActions(getOptimalPath(myPosition, midpoint, beliefs));
//         return { intention: { type: desireType.MOVE, position: midpoint }, path: pathToMidpoint };
//     }
// }

// export function handlePickupTeam(
//     intention: Intention,
//     beliefs: BeliefBase
// ): { intention: Intention; path: atomicActions[] } {
//     const midpoint = beliefs.getBelief<Position>("midpoint")!;
//     const myPosition = beliefs.getBelief<Position>("position")!;
//     const parcels = beliefs.getBelief<Parcel[]>("parcels");
//     const parcelsCarried = beliefs.getBelief<Parcel[]>("parcelsCarried")!;

//     // Check if the agent is already at the midpoint
//     if (myPosition && myPosition.x === midpoint.x && myPosition.y === midpoint.y) {
//         // Agent is at midpoint, need to check if courier is here
//         const courierAtMidpoint = beliefs.getBelief<boolean>("courierAtMidpoint");
//         if (courierAtMidpoint) {
//             // Drop all parcels
//             const dropParcelsActions: atomicActions[] = parcelsCarried.map(() => drop());
//             return { intention: intention, path: [...dropParcelsActions] };
//         } else {
//             // If courier is not at midpoint, wait for courier
//             return { intention: { type: desireType.MOVE, position: midpoint }, path: [atomicActions.wait] };
//         }
//     } else {
//         // If not at midpoint and not carrying parcels, find a parcel and pick it up, then go to midpoint
//         if ((parcelsCarried?.length ?? 0) === 0 && (parcels?.length ?? 0) > 0) {
//             const nearestParcel = getNearestEntity(myPosition, parcels);
//             const pathToParcel = getPathToPosition(myPosition, nearestParcel, beliefs).map(pos => move(pos));
//             return {
//                 intention: { type: desireType.MOVE, position: nearestParcel },
//                 path: [...pathToParcel, pick(nearestParcel)]
//             };
//         } else if ((parcelsCarried?.length ?? 0) > 0) {
//             // If already carrying parcels, go to midpoint
//             const pathToMidpoint = getPathToPosition(myPosition, midpoint, beliefs).map(pos => move(pos));
//             return { intention: { type: desireType.MOVE, position: midpoint }, path: pathToMidpoint };
//         } else {
//             // No parcels to pick up, return an empty plan
//             return { intention: intention, path: [] };
//         }
//     }
// }

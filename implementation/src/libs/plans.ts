import { COURIER_EXPLORATION_RANGE } from "../config";
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
import {
    getNearestDeliverySpot,
    selectBestExplorationTile,
} from "./utils/desireUtils";
import {
    getDeliverySpot,
    getNearestTile,
    manhattanDistance,
} from "./utils/mapUtils";
import {
    convertPathToActions,
    getOptimalPath,
    getVisitedTilesFromPlan,
} from "./utils/pathfinding";
import {
    isParcelAdajacentToPosition,
    isTeammateAdjacentToPosition,
    isTeammateAtPosition,
    parcelsCompare,
} from "./utils/planUtils";

export function handlePickup(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;
    const strategy = beliefs.getBelief<Strategies>("strategy")!;

    if (!intention.possibleParcels || intention.possibleParcels.length === 0) {
        console.error("No parcels available for pickup");
        return { path: [], intention: intention };
    }

    const sorted = intention.possibleParcels
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

    const bestPlanAndParcel = sorted[0];
    const bestPlan = bestPlanAndParcel.path;

    if (!bestPlan) {
        console.error("Error in pathfinding: No plan found.");
        return { path: [], intention };
    }

    if (
        bestPlan.length === 0 &&
        (bestPlanAndParcel.x !== curPos.x || bestPlanAndParcel.y !== curPos.y)
    ) {
        console.error(
            "Error in pathfinding: Empty plan but not at destination."
        );
        return { path: [], intention };
    }
    const bestPlanParcel: Parcel = {
        id: bestPlanAndParcel.id,
        x: bestPlanAndParcel.x,
        y: bestPlanAndParcel.y,
        carriedBy: bestPlanAndParcel.carriedBy,
        reward: bestPlanAndParcel.reward,
    };

    // console.log("Best plan", bestPlan);

    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const carryingParcels =
        parcels?.filter(
            (p) => p.carriedBy === beliefs.getBelief<string>("id")
        ) ?? [];

    if (carryingParcels.length > 0) {
        const tilesToVisit = bestPlanAndParcel.tilesOnPath;
        for (let i = 0; i < tilesToVisit.length; i++) {
            const tile = tilesToVisit[i];
            if (tile.type == 2) {
                const path = bestPlan.slice(0, i);
                path.push(atomicActions.drop);
                const role = beliefs.getBelief<string>("role");
                let newIntention: Intention;
                if (role === "explorer") {
                    newIntention = {
                        type: desireType.EXPLORER_DELIVER_ON_PATH,
                        details: { deliverySpot: { x: tile.x, y: tile.y } },
                    };
                } else {
                    newIntention = {
                        type: desireType.DELIVER,
                        details: { deliverySpot: { x: tile.x, y: tile.y } },
                    };
                }
                return { path: path, intention: newIntention };
            }
        }
    }

    bestPlan.push(atomicActions.pickup);
    const newIntention: Intention = {
        type: intention.type || desireType.PICKUP,
        details: { parcelsToPickup: [bestPlanParcel] },
    };
    return { path: bestPlan, intention: newIntention };
}

export function handleDeliver(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;
    const deliveryPos = getDeliverySpot(curPos, 0, beliefs);
    // console.log("Delivery pos", deliveryPos.position);
    const path = convertPathToActions(
        getOptimalPath(curPos, deliveryPos.position, beliefs)
    );
    if (!path) {
        console.error("Error in pathfinding");
        return { path: [], intention: intention };
    }

    path.push(atomicActions.drop);
    const newIntention: Intention = {
        type: intention.type || desireType.DELIVER,
        details: { deliverySpot: deliveryPos.position },
    };
    return { path: path, intention: newIntention };
}

export function handleMove(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const curPos = beliefs.getBelief<Position>("position")!;

    if (
        intention.details?.targetPosition &&
        (intention.details?.targetPosition.x !== curPos.x ||
            intention.details?.targetPosition.y !== curPos.y)
    ) {
        const path = convertPathToActions(
            getOptimalPath(curPos, intention.details?.targetPosition, beliefs)
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
    const role = beliefs.getBelief<string>("role");
    if (role !== "courier") {
        return { path: [], intention: intention };
    }

    const midpoint = beliefs.getBelief<Position>("midpoint")!;
    const curPos = beliefs.getBelief<Position>("position")!;
    const teammateIntentionType = beliefs.getBelief<desireType>(
        "teammateIntentionType"
    );
    if (teammateIntentionType === desireType.EXPLORER_DELIVER) {
        if (curPos.x === midpoint.x && curPos.y === midpoint.y) {
            if (isTeammateAdjacentToPosition(midpoint, beliefs)) {
                // If a teammate is adjacent to the midpoint, wait
                return { path: [atomicActions.wait], intention: intention };
            } else {
                return { path: [atomicActions.wait], intention: intention };
            }
        } else {
            const newIntention: Intention = {
                type: desireType.COURIER_MOVE,
                details: { targetPosition: midpoint },
            };
            return handleMove(newIntention, beliefs);
        }
    } else {
        // If the teammate is not delivering, look for tiles near the midpoint
        let bestTileToExplore: Position | null = selectBestExplorationTile(
            beliefs,
            midpoint,
            COURIER_EXPLORATION_RANGE
        );
        if (!bestTileToExplore) {
            const newIntention: Intention = {
                type: desireType.COURIER_MOVE,
                details: { targetPosition: midpoint },
            };
            return handleMove(newIntention, beliefs);
        }

        const newIntention: Intention = {
            type: desireType.COURIER_MOVE,
            details: { targetPosition: bestTileToExplore },
        };
        return handleMove(newIntention, beliefs);
    }
}

export function handleCourierPickup(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const role = beliefs.getBelief<string>("role");
    if (role !== "courier") {
        return { path: [], intention: intention };
    }

    const curPos = beliefs.getBelief<Position>("position")!;
    const midpoint = beliefs.getBelief<Position>("midpoint")!;
    const possibleParcels = intention.possibleParcels || [];
    const parcelsNearMidpoint = possibleParcels.filter(
        (p) => p.carriedBy === null && isParcelAdajacentToPosition(midpoint, p)
    );

    const parcelsLeftToPickup = [];
    let parcelsLeftPosition: Position | null = null;
    if (curPos.x === midpoint.x && curPos.y === midpoint.y) {
        for (const parcel of parcelsNearMidpoint) {
            if (isParcelAdajacentToPosition(midpoint, parcel)) {
                if (parcelsLeftPosition == null) {
                    parcelsLeftPosition = {
                        x: parcel.x,
                        y: parcel.y,
                    } as Position;
                    parcelsLeftToPickup.push(parcel);
                } else if (
                    parcelsLeftPosition.x == parcel.x ||
                    parcelsLeftPosition.y == parcel.y
                ) {
                    parcelsLeftToPickup.push(parcel);
                }
            }
        }
    }

    if (parcelsLeftToPickup.length > 0) {
        const newIntention: Intention = {
            type: desireType.COURIER_PICKUP,
            details: { parcelsToPickup: parcelsLeftToPickup },
        };
        // If there are parcels left to pickup, move towards them
        const path = convertPathToActions(
            getOptimalPath(curPos, parcelsLeftPosition!, beliefs)
        );
        if (!path) {
            console.error("Error in pathfinding");
            return { path: [], intention: newIntention };
        }
        path.push(atomicActions.pickup);
        return { path: path, intention: newIntention };
    } else {
        const newIntention = {
            type: desireType.PICKUP,
            possibleParcels: possibleParcels || [],
        };
        return handlePickup(newIntention, beliefs);
    }
}

export function handleCourierDeliver(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const role = beliefs.getBelief<string>("role");
    if (role !== "courier") {
        return { path: [], intention: intention };
    }
    return handleDeliver(intention, beliefs);
}

export function handleExplorerMove(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const role = beliefs.getBelief<string>("role");
    if (role !== "explorer") {
        return { path: [], intention: intention };
    }
    return handleMove(intention, beliefs);
}

export function handleExplorerPickup(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const role = beliefs.getBelief<string>("role");
    if (role !== "explorer") {
        return { path: [], intention: intention };
    }
    return handlePickup(intention, beliefs);
}

export function handleExplorerDeliver(
    intention: Intention,
    beliefs: BeliefBase
): { intention: Intention; path: atomicActions[] } {
    const role = beliefs.getBelief<string>("role");
    if (role !== "explorer") {
        return { path: [], intention: intention };
    }
    const curPos = beliefs.getBelief<Position>("position")!;
    const midpoint = beliefs.getBelief<Position>("midpoint")!;
    if (manhattanDistance(curPos, midpoint) == 1) {
        if (isTeammateAtPosition(midpoint, beliefs)) {
            // If a teammate is at the midpoint, drop the parcels
            const parcels = beliefs.getBelief<Parcel[]>("visibleParcels") || [];
            const parcelsCarried = parcels.filter(
                (p) => p.carriedBy === beliefs.getBelief<string>("id")
            );

            if (parcelsCarried.length > 0) {
                console.log("Dropping parcels at midpoint", parcelsCarried);
                return { path: [atomicActions.drop], intention: intention };
            } else {
                // If no parcels
                console.log("No parcels to deliver at midpoint");
                return { path: [], intention: intention };
            }
        } else {
            return { path: [/*atomicActions.wait*/], intention: intention };
        }
    } else {
        const deliveryPos = getNearestTile(midpoint, curPos, beliefs);
        console.log("Delivery pos", deliveryPos, " midpoint", midpoint);
        const path = convertPathToActions(
            getOptimalPath(curPos, deliveryPos, beliefs)
        );
        if (!path) {
            console.error("Error in pathfinding");
            return { path: [], intention: intention };
        }
        const newIntention: Intention = {
            type: desireType.EXPLORER_DELIVER,
            details: { deliverySpot: deliveryPos },
        };
        return { path: path, intention: newIntention };
    }
}

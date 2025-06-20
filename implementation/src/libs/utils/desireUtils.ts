import {
    Position,
    atomicActions,
    Parcel,
    Agent,
    desireType,
    Intention,
} from "../../types/types";
import { BeliefBase } from "../beliefs";
import { MapConfig } from "../../types/types";
import { aStarPath, convertPathToActions, getOptimalPath } from "./pathfinding";
import { getDeliverySpot, getMinDistance, getTileIndex, isMidpoint } from "./mapUtils";
import { getConfig, Strategies, zip } from "./common";
import { MAX_DISTANCE_EXPLORATION } from "../../config";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { rewardNormalizations } from "./planUtils";
import { get } from "http";


/**
 * Returns the nearest parcel to the agent based on the current beliefs.
 * @param {Object} params - The parameters.
 * @param {BeliefBase} params.beliefs - The current belief base.
 * @returns {{ parcel: Parcel, path: atomicActions[], time: number } | null} The nearest parcel and associated path/time, or null if none found.
 */
export const getNearestParcel = ({
    beliefs,
}: {
    beliefs: BeliefBase;
}): { parcel: Parcel; path: atomicActions[]; time: number } | null => {
    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const curPos = beliefs.getBelief<Position>("position");
    const map = beliefs.getBelief<MapConfig>("map");
    const agentId = beliefs.getBelief<string>("id");

    if (!parcels || !curPos || !map || !agentId)
        throw new Error("Missing beliefs");

    const [firstParcel, ...rest] = parcels.filter((p) => !p.carriedBy);
    if (!firstParcel) return null;

    const pathToFirst = convertPathToActions(
        getOptimalPath(curPos, { x: firstParcel.x, y: firstParcel.y }, beliefs)
    );
    let minLength;
    let minParcel;
    let minPath;

    if (pathToFirst != null) {
        minLength = pathToFirst.length;
        minParcel = firstParcel;
        minPath = pathToFirst;
    } else {
        minLength = Infinity;
        minParcel = null;
        minPath = null;
    }

    for (const parcel of rest) {
        const path = convertPathToActions(
            getOptimalPath(curPos, { x: parcel.x, y: parcel.y }, beliefs)
        );
        if (path == null) continue;
        const length = path.length;
        if (length < minLength) {
            minLength = length;
            minParcel = parcel;
            minPath = path;
        }
    }

    if (minParcel == null || minPath == null) return null;
    return {
        parcel: minParcel,
        path: minPath,
        time: timeForPath({ path: minPath }).time,
    };
};

/**
 * Returns the nearest delivery spot from the given start position.
 * @param {Object} params - The parameters.
 * @param {Position} params.startPosition - The starting position.
 * @param {BeliefBase} params.beliefs - The current belief base.
 * @param {boolean} [params.onlyReachable=false] - Whether to consider only reachable spots.
 * @returns {any} The nearest delivery spot.
 */
export const getNearestDeliverySpot = ({
    startPosition,
    beliefs,
    onlyReachable = false,
}: {
    startPosition: Position;
    beliefs: BeliefBase;
    onlyReachable?: boolean;
}) => getDeliverySpot(startPosition, 0, beliefs, onlyReachable);

/**
 * Returns the position of the tile n steps toward the center direction.
 * @param {number} nStep - Number of steps toward the center.
 * @param {Position} position - The starting position.
 * @param {BeliefBase} beliefs - The current belief base.
 * @returns {Position} The target tile position.
 */
export const getCenterDirectionTilePosition = (
    nStep: number,
    position: Position,
    beliefs: BeliefBase
): Position => {
    const map = beliefs.getBelief<MapConfig>("map");
    if (!map) throw new Error("Missing map");

    const center: Position = {
        x: Math.floor(map.width / 2),
        y: Math.floor(map.height / 2),
    };
    const tiles = map.tiles;
    // Find the tile closest to the center using Manhattan distance
    let minDistance = Infinity;
    let closestTile = center;

    for (let x = 0; x < map.width; x++) {
        for (let y = 0; y < map.height; y++) {
            const tile = tiles.find((t) => t.x === x && t.y === y);
            if (!tile) continue;
            const distance = Math.abs(x - center.x) + Math.abs(y - center.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestTile = { x, y };
            }
        }
    }

    center.x = closestTile.x;
    center.y = closestTile.y;

    const agents = beliefs.getBelief<Agent[]>("agents") || [];
    const obstacles = agents
        .filter((agent) => agent.x !== position.x || agent.y !== position.y)
        .map((agent) => ({ x: agent.x, y: agent.y }));

    const path = aStarPath(position, center, map, obstacles);

    if (!path || path.length === 0) {
        throw new Error(
            `No path found from (${position.x},${position.y}) to map center`
        );
    }

    const stepIndex = Math.min(nStep, path.length - 1);
    const targetTile = path[stepIndex];
    return { x: targetTile.x, y: targetTile.y };
};

/**
 * Calculates the time required to traverse a given path.
 * @param {Object} params - The parameters.
 * @param {atomicActions[]} params.path - The path as a list of actions.
 * @returns {{ time: number }} The time required for the path.
 */
export const timeForPath = ({ path }: { path: atomicActions[] }) => {
    const movementSpeed = getConfig<number>("MOVEMENT_DURATION");
    if (!movementSpeed) throw new Error("MOVEMENT_DURATION not found");
    return { time: path.length * movementSpeed };
};

/**
 * Computes exploration scores for each tile based on age and distance.
 * @param {BeliefBase} beliefs - The current belief base.
 * @param {number} maxDistance - The maximum distance for exploration.
 * @param {Position} startPos - The starting position.
 * @returns {number[][]} A 2D array of exploration scores.
 */
function computeExplorationScores(
    beliefs: BeliefBase,
    maxDistance: number,
    startPos: Position
): number[][] {
    const mapTypes = beliefs.getBelief<number[][]>("mapTypes")!;
    const map = beliefs.getBelief<MapConfig>("map")!;
    const dist = beliefs.getBelief<number[][]>("dist")!;
    const lastVisited = beliefs.getBelief<number[][]>("lastVisited")!;
    const currentPosition = beliefs.getBelief<{ x: number; y: number }>(
        "position"
    )!;

    const visionRange = getConfig<number>("AGENTS_OBSERVATION_DISTANCE")!;
    const currentTime = Date.now();

    const { height, width } = map;

    // Step 1: Mark currently visible tiles
    const visible: boolean[][] = Array.from({ length: width }, () =>
        Array(height).fill(false)
    );
    if (startPos.x == currentPosition.x && startPos.y == currentPosition.y) {
        for (let dx = -visionRange; dx <= visionRange; dx++) {
            for (let dy = -visionRange; dy <= visionRange; dy++) {
                const nx = currentPosition.x + dx;
                const ny = currentPosition.y + dy;

                if (
                    nx >= 0 &&
                    ny >= 0 &&
                    nx < width &&
                    ny < height &&
                    Math.abs(dx) + Math.abs(dy) <= visionRange
                ) {
                    visible[nx][ny] = true;
                }
            }
        }
    }

    // Step 2: Compute exploration scores
    const scores: number[][] = Array.from({ length: width }, () =>
        Array(height).fill(0)
    );

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            // Skip non-traversable tiles
            if (mapTypes[x][y] !== 1) continue;

            if (
                dist[getTileIndex(currentPosition, width)][
                    getTileIndex({ x, y }, width)
                ] === Infinity
            ) {
                // Skip tiles that are not reachable
                continue;
            }

            const dx = x - currentPosition.x;
            const dy = y - currentPosition.y;
            const distance = Math.abs(dx) + Math.abs(dy);

            if (distance > maxDistance || visible[x][y]) continue;

            let age: number;
            if (lastVisited[x][y] === -Infinity) {
                // Tile has never been visited — give it maximum age
                age = Number.MAX_SAFE_INTEGER;
            } else {
                age = currentTime - lastVisited[x][y];
            }

            scores[x][y] = age / (distance + 1); // +1 to avoid division by zero
        }
    }

    return scores;
}

/**
 * Selects the best tile to explore based on exploration scores.
 * @param {BeliefBase} beliefs - The current belief base.
 * @param {Position} startPos - The starting position.
 * @param {number} [maxDistance=MAX_DISTANCE_EXPLORATION] - The max distance for exploration.
 * @returns {Position | null} The best tile to explore, or null if none found.
 */
export function selectBestExplorationTile(
    beliefs: BeliefBase,
    startPos: Position,
    maxDistance: number = MAX_DISTANCE_EXPLORATION
): Position | null {
    const scores = computeExplorationScores(beliefs, maxDistance, startPos);
    const distances = beliefs.getBelief<number[][]>("dist")!;
    const mapWidth = scores[0].length;

    const currentIndex = getTileIndex(startPos, mapWidth);
    let bestTile: Position | null = null;
    let bestScore = -1;
    let bestDist = Infinity;

    for (let y = 0; y < scores.length; y++) {
        for (let x = 0; x < scores[0].length; x++) {
            const tile: Position = { x, y } as Position;
            const score = scores[x][y];

            if (score <= 0) continue;
            // console.log("Tile", tile, "has score", score);

            const targetIndex = getTileIndex(tile, mapWidth);
            const dist = distances[currentIndex][targetIndex];

            if (score > bestScore || (score === bestScore && dist < bestDist)) {
                bestScore = score;
                bestDist = dist;
                bestTile = tile;
            }
        }
    }

    if (bestTile === null) {
        // console.log("No valid tile found for exploration");
        return null;
    }

    if (bestTile.x === startPos.x && bestTile.y === startPos.y) {
        // console.log("Best tile is the current position, returning null");
        return null; // Don't explore the current position
    }

    // console.log(
    //     "Best tile to explore",
    //     bestTile,
    //     "with score",
    //     bestScore,
    //     "and distance",
    //     bestDist
    // );
    return bestTile;
}

/**
 * Considers picking up an additional parcel if beneficial.
 * @param {BeliefBase} beliefs - The current belief base.
 * @param {boolean} [cooperation=false] - Whether cooperation is enabled.
 * @returns {Intention | null} The intention to pick up a parcel, or null if not beneficial.
 */
export function considerAdditionalPickup(
    beliefs: BeliefBase,
    cooperation: boolean = false
): Intention | null {
    const reachableParcels = getReachableParcels({ beliefs });
    const DECAY_INTERVAL = getConfig<number>("PARCEL_DECADING_INTERVAL");
    const MOVEMENT_DURATION = getConfig<number>("MOVEMENT_DURATION");
    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const possibleCourierDeliverytime = estimateCourierDeliverytime(beliefs);
    const carryingParcels =
        parcels?.filter(
            (p) => p.carriedBy === beliefs.getBelief<string>("id")
        ) ?? [];

    if (!DECAY_INTERVAL || !MOVEMENT_DURATION) return null;

    if (reachableParcels.length === 0) return null;

    const deliverySpot = getNearestDeliverySpot({
        startPosition: beliefs.getBelief("position") as Position,
        beliefs,
    });

    const baseDeliveryTime = deliverySpot.distance * MOVEMENT_DURATION + (isMidpoint(deliverySpot.position, beliefs) ?  possibleCourierDeliverytime : 0);
    const baseDistance = deliverySpot.distance +(isMidpoint(deliverySpot.position, beliefs) ? possibleCourierDeliverytime / MOVEMENT_DURATION : 0) ; // Assuming this is the distance from the current position to the delivery spo

    const baseReward = carryingParcels.reduce(
        (acc, p) =>
            acc +
            Math.max(
                0,
                p.reward - Math.floor(baseDeliveryTime / DECAY_INTERVAL)
            ),
        0
    );

    let bestParcel: Parcel | null = null;
    let bestGain = -Infinity;
    // console.log("Base reward:", baseReward);

    const gainFunction = gainFromReachableParcel(
        baseReward,
        baseDistance,
        beliefs,
        MOVEMENT_DURATION,
        DECAY_INTERVAL,
        carryingParcels,
        possibleCourierDeliverytime
    );
    const gains: number[] = []
    for (const reachableParcel of reachableParcels) {
        const gain = gainFunction(reachableParcel);
        gains.push(gain)
        if (gain > 0 && gain > bestGain) {
            bestGain = gain;
            bestParcel = reachableParcel.parcel;
        }
    }
    const parcelsAndGains = zip(reachableParcels, gains);
    const possileParcels = parcelsAndGains
        .filter(([_, gain]) => gain > 0)
        .map(([RP, _]) => RP.parcel);

    return bestParcel
        ? {
              type: desireType.PICKUP,
              possibleParcels: possileParcels,
          }
        : null;
}

export interface ReachableParcel {
    parcel: Parcel;
    time: number;
    distance: number;
}

export interface ReachableParcelArgs {
    beliefs: BeliefBase;
    filter?: (parcel: Parcel) => boolean;
}

/**
 * Returns all reachable parcels based on the current beliefs and optional filter.
 * @param {ReachableParcelArgs} params - The parameters.
 * @returns {ReachableParcel[]} Array of reachable parcels.
 */
export const getReachableParcels = ({
    beliefs,
    filter,
}: ReachableParcelArgs): ReachableParcel[] => {
    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const curPos = beliefs.getBelief<Position>("position");
    const map = beliefs.getBelief<MapConfig>("map");
    const speed = getConfig<number>("MOVEMENT_DURATION");

    if (!parcels || !curPos || !map || !speed)
        throw new Error("Missing beliefs");

    const uncarried = parcels.filter(
        (p) => !p.carriedBy && (!filter || filter(p))
    );

    const reachable: ReachableParcel[] = [];

    for (const parcel of uncarried) {
        const distance = getMinDistance({
            startPosition: curPos,
            endPosition: { x: parcel.x, y: parcel.y },
            beliefs,
        });

        const time = distance * speed;
        reachable.push({ parcel, time, distance });
    }

    return reachable;
};

/**
 * Returns a function that computes the gain from picking up a reachable parcel.
 * @param {number} baseReward - The base reward.
 * @param {number} baseDistance - The base distance.
 * @param {BeliefBase} beliefs - The current belief base.
 * @param {number} MOVEMENT_DURATION - Movement duration.
 * @param {number} DECAY_INTERVAL - Parcel decay interval.
 * @param {Parcel[]} carryingParcels - Parcels currently being carried.
 * @param {number} possibleCourierDeliverytime - Estimated courier delivery time.
 * @returns {(ReachableParcel) => number} Function to compute gain for a reachable parcel.
 */
export const gainFromReachableParcel =
    (
        baseReward: number,
        baseDistance: number,
        beliefs: BeliefBase,
        MOVEMENT_DURATION: number,
        DECAY_INTERVAL: number,
        carryingParcels: Parcel[],
        possibleCourierDeliverytime: number
    ) =>
    ({
        parcel,
        time: fromMeToParcelTime,
        distance: fromMeToParcelDistance,
    }: ReachableParcel) => {
        const delivery = getNearestDeliverySpot({
            startPosition: { x: parcel.x, y: parcel.y },
            beliefs,
        });

        const deliverytime = delivery.distance * MOVEMENT_DURATION;
        const isMidpointDelivery = isMidpoint(delivery.position, beliefs);
        const totalTime = fromMeToParcelTime + deliverytime + (isMidpointDelivery ? possibleCourierDeliverytime : 0);
        const totalDistance = fromMeToParcelDistance + delivery.distance + (isMidpointDelivery ? possibleCourierDeliverytime / MOVEMENT_DURATION : 0);

        const totalReward = [
            ...carryingParcels.map((p) =>
                Math.max(0, p.reward - Math.floor(totalTime / DECAY_INTERVAL))
            ),
            Math.max(0, parcel.reward - Math.floor(totalTime / DECAY_INTERVAL)),
        ].reduce((a, b) => a + b, 0);

        // console.log("Parcel:", parcel.id,"Reward:", parcel.reward, "Total Reward:", totalReward, "fromMeToParcelTime:", fromMeToParcelTime, "deliveryTime:", deliverytime, "totalTime:", totalTime);

        const strategy = beliefs.getBelief<Strategies>("strategy")!;
        const normalizedTotalReward = rewardNormalizations[strategy](
            totalReward,
            totalDistance
        );
        const normalizedBaseReward = rewardNormalizations[strategy](
            baseReward,
            baseDistance
        );

        return normalizedTotalReward - normalizedBaseReward;
    };

/**
 * Estimates the delivery time for a courier to deliver from the midpoint.
 * @param {BeliefBase} beliefs - The current belief base.
 * @returns {number} The estimated delivery time.
 */
export const estimateCourierDeliverytime = (beliefs: BeliefBase) : number => {
    const role = beliefs.getBelief<"explorer" | "courier" | null>("role");
    if (!role || role === "courier") return 0;
    const midpointToNextDeliveryPoint = getNearestDeliverySpot({
        startPosition: beliefs.getBelief<Position>("midpoint")!,
        beliefs,
        onlyReachable: true,
    }).distance;
    const deliveryTime = midpointToNextDeliveryPoint * getConfig<number>("MOVEMENT_DURATION")!;
    return deliveryTime;

}
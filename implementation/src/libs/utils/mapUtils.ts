import { MapConfig, MapTile, Position } from "../../types/types";
import { BeliefBase } from "../beliefs";
import { getOptimalPath } from "./pathfinding";

export function getKeyPos(pos: Position): string {
    return `${pos.x},${pos.y}`;
}

export function getKeyTile(tile: MapTile): string {
    return `${tile.x},${tile.y}`;
}

export function getTileIndex(pos: Position, mapWidth: number): number {
    return pos.y * mapWidth + pos.x;
}

export function getTilePosition(index: number, mapWidth: number): Position {
    return { y: Math.floor(index / mapWidth), x: index % mapWidth };
}

export function calculateMidpoint(beliefs: BeliefBase): Position {
    const map = beliefs.getBelief<{ width: number; height: number }>("map");
    const mapTypes = beliefs.getBelief<number[][]>("mapTypes");
    const distances = beliefs.getBelief<number[][]>("dist");
    const spawnables: Position[] = beliefs.getBelief<Position[]>("spawnables") || [];
    const deliveries: Position[] = beliefs.getBelief<Position[]>("deliveries") || [];

    const role = beliefs.getBelief<string>("role");
    const self = beliefs.getBelief<Position>("position");
    const teammatesPositions = beliefs.getBelief<Record<string, Position>>("teammatesPositions") || {};
    const teammate = Object.values(teammatesPositions)[0];

    const courier = role === "courier" ? self : teammate;
    const explorer = role === "explorer" ? self : teammate;

    if (!map || !mapTypes || !distances || !courier || !explorer) {
        throw new Error("Missing required beliefs.");
    }

    const width = map.width;
    const height = map.height;

    const index = (p: Position) => p.y * width + p.x;

    // Configuration parameters
    const MIDPOINT_RATIO = 0.4; // Percentage along path for midpoint
    const SAFETY_DISTANCE = 2; // Minimum distance from spawnable points
    const SEARCH_RADIUS = 2; // Search radius around target point

    let bestMidpoint: Position | null = null;
    let bestScore = -Infinity;

    // Try every spawnable-delivery pair
    for (const spawn of spawnables) {
        for (const delivery of deliveries) {
            const startIdx = index(spawn);
            const endIdx = index(delivery);
            const totalDist = distances[startIdx][endIdx];

            if (totalDist === Infinity || totalDist === undefined) continue;

            const targetDist = Math.floor(totalDist * MIDPOINT_RATIO);

            // Search in a more focused area around the expected midpoint
            for (let offset = -SEARCH_RADIUS; offset <= SEARCH_RADIUS; offset++) {
                const currentTargetDist = targetDist + offset;

                // Use spiral search pattern for efficiency
                for (let radius = 0; radius <= SEARCH_RADIUS; radius++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        for (let dy = -radius; dy <= radius; dy++) {
                            if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                            const x = Math.min(Math.max(spawn.x + dx, 0), width - 1);
                            const y = Math.min(Math.max(spawn.y + dy, 0), height - 1);
                            const candidate = { x, y };

                            if (mapTypes[x][y] === 0) continue;

                            const d1 = distances[startIdx][index(candidate)];
                            const d2 = distances[index(candidate)][endIdx];

                            if (d1 + d2 === totalDist && d1 === currentTargetDist) {
                                // Calculate score based on multiple factors
                                let score = 0;
                                
                                // Factor 1: Safety distance from spawnables
                                const minSpawnDist = Math.min(...spawnables.map(sp => manhattanDistance(sp, candidate)));
                                if (minSpawnDist < SAFETY_DISTANCE) continue;
                                score += minSpawnDist;

                                // Factor 2: Accessibility (number of walkable adjacent tiles)
                                for (let ax = -1; ax <= 1; ax++) {
                                    for (let ay = -1; ay <= 1; ay++) {
                                        const adjX = x + ax;
                                        const adjY = y + ay;
                                        if (adjX >= 0 && adjX < width && adjY >= 0 && adjY < height && mapTypes[adjX][adjY] !== 0) {
                                            score += 1;
                                        }
                                    }
                                }

                                if (score > bestScore) {
                                    bestScore = score;
                                    bestMidpoint = candidate;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return bestMidpoint || courier; // Fallback to courier position if no suitable midpoint found
}

/**
 * Determines if the current position can reach any delivery spot.
 * If the role is "explorer", it includes the midpoint as a delivery spot.
 * 
 * @param beliefs - The belief base containing map and agent information.
 * @returns True if the current position can reach a delivery spot, false otherwise.
 */
export function canReachDeliverySpot(beliefs: BeliefBase): boolean {
    const deliveries: MapTile[] = beliefs.getBelief("deliveries") as MapTile[];
    const role = beliefs.getBelief("role") as string;
    if (role === "explorer") {
        const midpoint = beliefs.getBelief<MapTile>("modipoint")
        if(midpoint){
            deliveries.push(midpoint);
        }else{
            console.warn("canReachDeliverySpot No midpoint found");
        }
    }
    const curPos: Position = beliefs.getBelief("position") as Position;

    for (const delivery of deliveries) {
        if (curPos.x === delivery.x && curPos.y === delivery.y) {
            return true; // Already at the delivery spot
        }
        const path = getOptimalPath(curPos, delivery, beliefs);
        if (path && path.length > 0) {
            return true; // Found a reachable delivery spot
        }
    }
    return false; // No reachable delivery spots found
}

/**
 * Determines if the current position can reach any spawnable spot.
 * 
 * @param beliefs - The belief base containing map and agent information.
 * @returns True if the current position can reach a spawnable spot, false otherwise.
 */
export function canReachSpawnableSpot(
    beliefs: BeliefBase
): boolean {
    const spawnables: MapTile[] = beliefs.getBelief("spawnables") as MapTile[];
    const curPos: Position = beliefs.getBelief("position") as Position;

    for (const spawnable of spawnables) {
        if (curPos.x === spawnable.x && curPos.y === spawnable.y) {
            return true; // Already at the delivery spot
        }
        const path = getOptimalPath(curPos, spawnable, beliefs);
        if (path && path.length > 0) {
            return true; // Found a reachable delivery spot
        }
    }
    return false; // No reachable delivery spots found
}

/**
 * Finds a delivery spot that is at least a minimum movement distance away from the start position.
 * If the role is "explorer", the midpoint is included as a delivery spot.
 * 
 * @param startPos - The starting position.
 * @param minMovement - The minimum required distance.
 * @param beliefs - The belief base containing map and pathfinding information.
 * @param onlyReachable - If true, only considers spots reachable by pathfinding.
 * @returns An object containing the position of the delivery spot and the distance to it.
 */
export function getDeliverySpot(
    startPos: Position,
    minMovement: number,
    beliefs: BeliefBase,
    onlyReachable: boolean = false
): { position: Position; distance: number } {
    const deliveries: MapTile[] = beliefs.getBelief("deliveries") as MapTile[];
    const role = beliefs.getBelief("role") as string;
    if (role === "explorer") {
        const midpoint = beliefs.getBelief<MapTile>("modipoint")
        if(midpoint){
            deliveries.push(midpoint);
        }else{
            console.warn("explorer but no midpoint found");
        }
    }
    const distances = beliefs.getBelief<number[][]>("dist")!;
    
    const map: MapConfig = beliefs.getBelief("map") as MapConfig;
    let minDistance: number = Infinity;
    let minDistancePos;
    for (let i = 0; i < deliveries.length; i++) {
        const pos: Position = { x: deliveries[i].x, y: deliveries[i].y };
        let dist: number;
        if(!onlyReachable){
            dist = distances[getTileIndex(startPos, map.width)][
                    getTileIndex(pos, map.width)
                ];
        }else{
            const path = getOptimalPath(startPos, pos, beliefs);
            if (path.length === 0){
                dist = Infinity;
            }else{
                dist = path.length;
            }
        }
        if (dist >= minMovement && dist < minDistance) {
            minDistance = dist;
            minDistancePos = pos;
        }
    }
    return {
        position: minDistancePos as Position,
        distance: minDistance,
    };
}

/**
 * Finds a spawnable spot that is at least a minimum movement distance away from the start position.
 * 
 * @param startPos - The starting position.
 * @param minMovement - The minimum required distance.
 * @param beliefs - The belief base containing map and pathfinding information.
 * @returns An object containing the position of the spawnable spot and the distance to it.
 */
export function getSpawnableSpot(
    startPos: Position,
    minMovement: number,
    beliefs: BeliefBase
): { position: Position; distance: number } {
    const spawnables: MapTile[] = beliefs.getBelief("spawnables") as MapTile[];
    const distances: number[][] = beliefs.getBelief("dist") as number[][];
    const map: MapConfig = beliefs.getBelief("map") as MapConfig;
    let minDistance: number = Infinity;
    let minDistancePos;
    for (let i = 0; i < spawnables.length; i++) {
        const pos: Position = { x: spawnables[i].x, y: spawnables[i].y };
        const dist =
            distances[getTileIndex(startPos, map.width)][
                getTileIndex(pos, map.width)
            ];
        if (dist >= minMovement && dist < minDistance) {
            minDistance = dist;
            minDistancePos = pos;
        }
    }
    return {
        position: minDistancePos as Position,
        distance: minDistance,
    };
}

/**
 * Retrieves the minimum distance between two positions using precomputed distances.
 * 
 * @param params.startPosition - The starting position.
 * @param params.endPosition - The ending position.
 * @param params.beliefs - The belief base containing distance and map information.
 * @returns The minimum distance between startPosition and endPosition.
 */
export const getMinDistance = ({
    startPosition,
    endPosition,
    beliefs,
}: {
    startPosition: Position;
    endPosition: Position;
    beliefs: BeliefBase;
}) => {
    const distances: number[][] = beliefs.getBelief("dist") as number[][];
    const map: MapConfig = beliefs.getBelief("map") as MapConfig;
    return distances[getTileIndex(startPosition, map.width)][
        getTileIndex(endPosition, map.width)
    ];
};

/**
 * Calculates the Manhattan distance between two positions.
 * 
 * @param pos1 - The first position.
 * @param pos2 - The second position.
 * @returns The Manhattan distance between pos1 and pos2.
 */
export function manhattanDistance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

//Given a target tile and the current position, find the nearest tile that is adjacent to the target tile

/**
 * Finds the nearest tile adjacent to the target tile from the current position.
 * 
 * @param targetTile - The target tile position.
 * @param curPos - The current position.
 * @param beliefs - The belief base containing distance and map information.
 * @returns The position of the nearest adjacent tile to the target tile.
 */
export function getNearestTile(
    targetTile: Position,
    curPos: Position,
    beliefs: BeliefBase
): Position {
    const distances: number[][] = beliefs.getBelief("dist") as number[][];
    const map: MapConfig = beliefs.getBelief("map") as MapConfig;
    const possibleTiles: Position[] = [
        { x: targetTile.x + 1, y: targetTile.y },
        { x: targetTile.x - 1, y: targetTile.y },
        { x: targetTile.x, y: targetTile.y + 1 },
        { x: targetTile.x, y: targetTile.y - 1 },
    ];
    let minDistance = Infinity;
    let nearestTile: Position = { x: -1, y: -1 };

    for (const tile of possibleTiles) {
        if (
            tile.x < 0 ||
            tile.x >= map.width ||
            tile.y < 0 ||
            tile.y >= map.height
        ) {
            continue; // Skip out-of-bounds tiles
        }
        const distance =
            distances[getTileIndex(curPos, map.width)][
                getTileIndex(tile, map.width)
            ];
        if (distance < minDistance) {
            minDistance = distance;
            nearestTile = tile;
        }
    }
    return nearestTile;
}

/**
 * Checks if a given position matches the midpoint position stored in beliefs.
 * 
 * @param pos - The position to check.
 * @param beliefs - The belief base containing the midpoint information.
 * @returns True if pos matches the midpoint, false otherwise.
 */
export const isMidpoint = (pos: Position, beliefs: BeliefBase): boolean => {
    const midpoint = beliefs.getBelief<Position>("midpoint") as Position;
    if (!midpoint) return false;
    return pos.x === midpoint.x && pos.y === midpoint.y;
};
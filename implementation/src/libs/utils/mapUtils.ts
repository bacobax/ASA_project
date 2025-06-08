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

    // Try every spawnable-delivery pair
    for (const spawn of spawnables) {
        for (const delivery of deliveries) {
            const startIdx = index(spawn);
            const endIdx = index(delivery);
            const dist = distances[startIdx][endIdx];

            if (dist === Infinity || dist === undefined) continue;

            // Walk along the path from spawn to delivery and stop around 40-60% of the way
            const stepsFromSpawn = Math.floor(dist * 0.4);

            // Try tiles within a few steps of that point
            for (let offset = -1; offset <= 1; offset++) {
                const targetDist = stepsFromSpawn + offset;

                for (let x = 0; x < width; x++) {
                    for (let y = 0; y < height; y++) {
                        const candidate = { x, y };
                        if (mapTypes[x][y] === 0) continue;

                        const d1 = distances[startIdx][index(candidate)];
                        const d2 = distances[index(candidate)][endIdx];
                        if (d1 + d2 === dist && d1 === targetDist) {
                            // Ensure at least 2 tiles from any spawnable
                            const safe = spawnables.every(sp => manhattanDistance(sp, candidate) >= 2);
                            if (safe) return candidate;
                        }
                    }
                }
            }
        }
    }

    // Fallback: use courier position if no good midpoint
    return courier;
}

export function canReachDeliverySpot(beliefs: BeliefBase): boolean {
    const deliveries: MapTile[] = beliefs.getBelief("deliveries") as MapTile[];
    const role = beliefs.getBelief("role") as string;
    if (role === "explorer") {
        const midpoint = beliefs.getBelief<MapTile>("modipoint")
        if(midpoint){
            deliveries.push(midpoint);
        }else{
            console.warn("No midpoint found");
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

export function getDeliverySpot(
    startPos: Position,
    minMovement: number,
    beliefs: BeliefBase
): { position: Position; distance: number } {
    const deliveries: MapTile[] = beliefs.getBelief("deliveries") as MapTile[];
    const role = beliefs.getBelief("role") as string;
    if (role === "explorer") {
        const midpoint = beliefs.getBelief<MapTile>("modipoint")
        if(midpoint){
            deliveries.push(midpoint);
        }else{
            console.warn("No midpoint found");
        }
    }
    const distances: number[][] = beliefs.getBelief("dist") as number[][];
    const map: MapConfig = beliefs.getBelief("map") as MapConfig;
    let minDistance: number = Infinity;
    let minDistancePos;
    for (let i = 0; i < deliveries.length; i++) {
        const pos: Position = { x: deliveries[i].x, y: deliveries[i].y };
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

export function manhattanDistance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

//Given a target tile and the current position, find the nearest tile that is adjacent to the target tile
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

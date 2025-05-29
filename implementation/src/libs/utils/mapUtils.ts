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

function isTraversable(tileType: number): boolean {
    return tileType === 1 || tileType === 2 || tileType === 3; // 1: traversable, 2: spawnable, 3: delivery
}

/**
 * Calculates the optimal midpoint between two teammates for parcel exchange.
 * Assumes a team of 2 and calculates the midpoint once when cooperation begins.
 */
export function calculateMidpoint(beliefs: BeliefBase): Position {
    const selfPos = beliefs.getBelief<Position>("position");
    const teammates = beliefs.getBelief<Record<string, Position>>("teammatesPositions");
    const teammateId = beliefs.getBelief<string[]>("teammatesIds")?.[0]; // assume team of 2

    if (!selfPos || !teammateId || !teammates?.[teammateId]) {
        throw new Error("Missing teammate or position info.");
    }

    const teammatePos = teammates[teammateId];
    const midX = Math.floor((selfPos.x + teammatePos.x) / 2);
    const midY = Math.floor((selfPos.y + teammatePos.y) / 2);

    const map = beliefs.getBelief<MapConfig>("map");
    const mapTypes = beliefs.getBelief<number[][]>("mapTypes");
    const dist = beliefs.getBelief<number[][]>("dist") as number[][];

    if (!map || !mapTypes || !dist) {
        throw new Error("Map data or distance matrix missing.");
    }

    // Precompute all spawnable positions
    const spawnables: Position[] = [];
    for (let x = 0; x < map.width; x++) {
        for (let y = 0; y < map.height; y++) {
            if (mapTypes[x][y] === 2) {
                spawnables.push({ x, y });
            }
        }
    }

    // Utility to get tile index
    const tileIndex = (pos: Position) => pos.y * map.width + pos.x;

    let bestPos: Position = { x: midX, y: midY };
    let minDistance = Infinity;

    // Search nearby tiles around midpoint
    const radius = 3;
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            const x = midX + dx;
            const y = midY + dy;

            if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
            const tileType = mapTypes[x][y];
            if (!isTraversable(tileType)) continue;

            const currentIndex = tileIndex({ x, y });

            // Ensure the tile is at least 2 path tiles away from every spawnable tile
            const tooCloseToSpawn = spawnables.some(spawn => {
                const spawnIndex = tileIndex(spawn);
                return dist[currentIndex][spawnIndex] < 2;
            });
            if (tooCloseToSpawn) continue;

            const distSelf = manhattanDistance(selfPos, { x, y });
            const distMate = manhattanDistance(teammatePos, { x, y });
            const totalDist = distSelf + distMate;

            if (totalDist < minDistance) {
                minDistance = totalDist;
                bestPos = { x, y };
            }
        }
    }

    return bestPos;
}

export function canReachDeliverySpot(beliefs: BeliefBase): boolean {
    const deliveries: MapTile[] = beliefs.getBelief("deliveries") as MapTile[];
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
    const spawnables: MapTile[] = beliefs.getBelief("spawnable") as MapTile[];
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
    const spawnables: MapTile[] = beliefs.getBelief("spawnable") as MapTile[];
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

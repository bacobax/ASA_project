import { MapConfig, MapTile, Position } from "../../types/types";
import { BeliefBase } from "../beliefs";

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

export function ManhattanDistance(pos1: Position, pos2: Position): number {
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

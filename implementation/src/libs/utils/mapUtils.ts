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

export function getDeliverySpot(startPos: Position, minMovement: number, beliefs: BeliefBase): Position {
    const deliveries: MapTile[] = beliefs.getBelief("deliveries") as MapTile[];
    const distances: number[][] = beliefs.getBelief("dist") as number[][];
    const map: MapConfig = beliefs.getBelief("map") as MapConfig;
    let minDistance: number = Infinity;
    let minDistancePos;
    for (let i = 0; i < deliveries.length; i++) {
        const pos: Position = { x: deliveries[i].x, y: deliveries[i].y };
        const dist = distances[getTileIndex(startPos, map.width)][getTileIndex(pos, map.width)];
        if (dist >= minMovement && dist < minDistance) {
            minDistance = dist;
            minDistancePos = pos;
        }
    }
    return minDistancePos as Position;
}
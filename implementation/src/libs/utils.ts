import { MapTile, MapConfig, Position, atomicActions } from "../types/types";

export function floydWarshallWithPaths(mapConfig: MapConfig) {
    const { width, height, tiles } = mapConfig;
    const numTiles = width * height;

    // Create a map of valid tiles for quick lookup
    const validTiles = new Map<string, MapTile>();
    tiles.forEach(tile => validTiles.set(`${tile.x},${tile.y}`, tile));

    // Distance and predecessor matrices
    const dist: number[][]= Array.from({ length: numTiles }, () => Array(numTiles).fill(Infinity));
    const prev: number[][] = Array.from({ length: numTiles }, () => Array(numTiles).fill(-1));

    // Path storage
    const paths: Map<number, Map<number, MapTile[]>> = new Map();

    // Initialize all possible tiles (even empty ones)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x; // Convert (x, y) to a linear index
            paths.set(i, new Map());

            // If the tile is valid (not a wall), initialize distances
            if (validTiles.has(`${x},${y}`)) {
                dist[i][i] = 0; // Distance to itself is 0

                // Check adjacent tiles (up, down, left, right)
                const neighbors = [
                    { dx: -1, dy: 0 }, // Left
                    { dx: 1, dy: 0 },  // Right
                    { dx: 0, dy: -1 }, // Up
                    { dx: 0, dy: 1 }   // Down
                ];

                for (const { dx, dy } of neighbors) {
                    const nx = x + dx, ny = y + dy;
                    const j = ny * width + nx; // Convert (nx, ny) to linear index

                    if (validTiles.has(`${nx},${ny}`)) {
                        dist[i][j] = 1; // Distance between connected tiles is 1
                        prev[i][j] = i; // Initial predecessor
                        paths.get(i)?.set(j, [validTiles.get(`${x},${y}`)!, validTiles.get(`${nx},${ny}`)!]); // Direct path
                    }
                }
            }
        }
    }

    // Apply Floyd-Warshall Algorithm
    for (let k = 0; k < numTiles; k++) {
        for (let i = 0; i < numTiles; i++) {
            for (let j = 0; j < numTiles; j++) {
                if (dist[i][j] > dist[i][k] + dist[k][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    prev[i][j] = prev[k][j];

                    // Construct path
                    const newPath = [
                        ...(paths.get(i)?.get(k) || []), // Safe fallback for undefined paths
                        ...(paths.get(k)?.get(j)?.slice(1) || [])
                    ];
                    paths.get(i)?.set(j, newPath);
                }
            }
        }
    }

    return { dist, prev, paths };
}

export function getOptimalPath(startPos:Position, endPos:Position,mapWidth:number, mapHeight:number, paths:Map<number, Map<number, MapTile[]>>):atomicActions[]{
    const startTileIndex = getTileIndex(startPos, mapWidth);
    const endTileIndex = getTileIndex(endPos, mapWidth);

    const path = paths.get(startTileIndex)?.get(endTileIndex);
    if (!path) {
        throw new Error("No path found from start to end.");
    }

    const actions: atomicActions[] = [];

    // Convert path from MapTile[] to atomicActions
    for (let i = 0; i < path.length - 1; i++) {
        const currentTile = path[i];
        const nextTile = path[i + 1];

        // Determine the direction from currentTile to nextTile and map to an atomic action
        if (nextTile.x > currentTile.x) {
            actions.push(atomicActions.moveRight);
        } else if (nextTile.x < currentTile.x) {
            actions.push(atomicActions.moveLeft);
        } else if (nextTile.y > currentTile.y) {
            actions.push(atomicActions.moveDown);
        } else if (nextTile.y < currentTile.y) {
            actions.push(atomicActions.moveUp);
        }
    }

    return actions;
}

export function getTileIndex(pos:Position, mapWidth:number):number{
    return pos.y * mapWidth + pos.x;
}



"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.floydWarshallWithPaths = floydWarshallWithPaths;
exports.getOptimalPath = getOptimalPath;
exports.getTileIndex = getTileIndex;
exports.getDeliverySpot = getDeliverySpot;
const types_1 = require("../types/types");
function floydWarshallWithPaths(mapConfig) {
    var _a, _b, _c, _d, _e;
    const { width, height, tiles } = mapConfig;
    const numTiles = width * height;
    // Create a map of valid tiles for quick lookup
    const validTiles = new Map();
    tiles.forEach(tile => validTiles.set(`${tile.x},${tile.y}`, tile));
    // Distance and predecessor matrices
    const dist = Array.from({ length: numTiles }, () => Array(numTiles).fill(Infinity));
    const prev = Array.from({ length: numTiles }, () => Array(numTiles).fill(-1));
    // Path storage
    const paths = new Map();
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
                    { dx: 1, dy: 0 }, // Right
                    { dx: 0, dy: -1 }, // Up
                    { dx: 0, dy: 1 } // Down
                ];
                for (const { dx, dy } of neighbors) {
                    const nx = x + dx, ny = y + dy;
                    const j = ny * width + nx; // Convert (nx, ny) to linear index
                    if (validTiles.has(`${nx},${ny}`)) {
                        dist[i][j] = 1; // Distance between connected tiles is 1
                        prev[i][j] = i; // Initial predecessor
                        (_a = paths.get(i)) === null || _a === void 0 ? void 0 : _a.set(j, [validTiles.get(`${x},${y}`), validTiles.get(`${nx},${ny}`)]); // Direct path
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
                        ...(((_b = paths.get(i)) === null || _b === void 0 ? void 0 : _b.get(k)) || []), // Safe fallback for undefined paths
                        ...(((_d = (_c = paths.get(k)) === null || _c === void 0 ? void 0 : _c.get(j)) === null || _d === void 0 ? void 0 : _d.slice(1)) || [])
                    ];
                    (_e = paths.get(i)) === null || _e === void 0 ? void 0 : _e.set(j, newPath);
                }
            }
        }
    }
    return { dist, prev, paths };
}
function getOptimalPath(startPos, endPos, mapWidth, mapHeight, paths) {
    var _a;
    const startTileIndex = getTileIndex(startPos, mapWidth);
    const endTileIndex = getTileIndex(endPos, mapWidth);
    const path = (_a = paths.get(startTileIndex)) === null || _a === void 0 ? void 0 : _a.get(endTileIndex);
    if (!path) {
        throw new Error("No path found from start to end.");
    }
    const actions = [];
    // Convert path from MapTile[] to atomicActions
    for (let i = 0; i < path.length - 1; i++) {
        const currentTile = path[i];
        const nextTile = path[i + 1];
        // Determine the direction from currentTile to nextTile and map to an atomic action
        if (nextTile.x > currentTile.x) {
            actions.push(types_1.atomicActions.moveRight);
        }
        else if (nextTile.x < currentTile.x) {
            actions.push(types_1.atomicActions.moveLeft);
        }
        else if (nextTile.y > currentTile.y) {
            actions.push(types_1.atomicActions.moveUp);
        }
        else if (nextTile.y < currentTile.y) {
            actions.push(types_1.atomicActions.moveDown);
        }
    }
    return actions;
}
function getTileIndex(pos, mapWidth) {
    return pos.y * mapWidth + pos.x;
}
function getDeliverySpot(startPos, minMovement, beliefs) {
    const deliveries = beliefs.getBelief("deliveries");
    const distances = beliefs.getBelief("dist");
    const map = beliefs.getBelief("map");
    let minDistance = Infinity;
    let minDistancePos;
    for (let i = 0; i < deliveries.length; i++) {
        const pos = { x: deliveries[i].x, y: deliveries[i].y };
        const dist = distances[getTileIndex(startPos, map.width)][getTileIndex(pos, map.width)];
        if (dist >= minMovement && dist < minDistance) {
            minDistance = dist;
            minDistancePos = pos;
        }
    }
    return minDistancePos;
}

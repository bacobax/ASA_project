"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.floydWarshallWithPaths = floydWarshallWithPaths;
exports.aStarPath = aStarPath;
exports.getVisitedTilesFromPlan = getVisitedTilesFromPlan;
exports.getOptimalPath = getOptimalPath;
exports.convertPathToActions = convertPathToActions;
const types_1 = require("../../types/types");
function floydWarshallWithPaths(mapConfig) {
    var _a, _b, _c, _d, _e;
    const { width, height, tiles } = mapConfig;
    const numTiles = width * height;
    const validTiles = new Map();
    tiles.forEach(tile => validTiles.set(`${tile.x},${tile.y}`, tile));
    const dist = Array.from({ length: numTiles }, () => Array(numTiles).fill(Infinity));
    const prev = Array.from({ length: numTiles }, () => Array(numTiles).fill(-1));
    const paths = new Map();
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            paths.set(i, new Map());
            if (validTiles.has(`${x},${y}`)) {
                dist[i][i] = 0;
                const neighbors = [
                    { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
                ];
                for (const { dx, dy } of neighbors) {
                    const nx = x + dx, ny = y + dy;
                    const j = ny * width + nx;
                    if (validTiles.has(`${nx},${ny}`)) {
                        dist[i][j] = 1;
                        prev[i][j] = i;
                        (_a = paths.get(i)) === null || _a === void 0 ? void 0 : _a.set(j, [validTiles.get(`${x},${y}`), validTiles.get(`${nx},${ny}`)]);
                    }
                }
            }
        }
    }
    for (let k = 0; k < numTiles; k++) {
        for (let i = 0; i < numTiles; i++) {
            for (let j = 0; j < numTiles; j++) {
                if (dist[i][j] > dist[i][k] + dist[k][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    prev[i][j] = prev[k][j];
                    const newPath = [
                        ...(((_b = paths.get(i)) === null || _b === void 0 ? void 0 : _b.get(k)) || []),
                        ...(((_d = (_c = paths.get(k)) === null || _c === void 0 ? void 0 : _c.get(j)) === null || _d === void 0 ? void 0 : _d.slice(1)) || [])
                    ];
                    (_e = paths.get(i)) === null || _e === void 0 ? void 0 : _e.set(j, newPath);
                }
            }
        }
    }
    return { dist, prev, paths };
}
function aStarPath(startPos, endPos, mapConfig, agents) {
    var _a;
    const { width, height, tiles } = mapConfig;
    const validTiles = new Map();
    tiles.forEach(tile => {
        validTiles.set(`${tile.x},${tile.y}`, tile);
    });
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    // const startTile = validTiles.get(`${startPos.x},${startPos.y}`);
    // const endTile = validTiles.get(`${endPos.x},${endPos.y}`);
    const startTile = tiles.find(tile => tile.x === startPos.x && tile.y === startPos.y);
    const endTile = tiles.find(tile => tile.x === endPos.x && tile.y === endPos.y);
    if (!startTile || !endTile)
        throw new Error("Invalid start or end position " + startPos.x + " " + startPos.y + " " + endPos.x + " " + endPos.y);
    const agentsSet = new Set(agents.map(p => `${p.x},${p.y}`));
    openSet.push(startTile);
    gScore.set(`${startPos.x},${startPos.y}`, 0);
    fScore.set(`${startPos.x},${startPos.y}`, manhattanDistance(startPos, endPos));
    while (openSet.length > 0) {
        openSet.sort((a, b) => { var _a, _b; return ((_a = fScore.get(`${a.x},${a.y}`)) !== null && _a !== void 0 ? _a : Infinity) - ((_b = fScore.get(`${b.x},${b.y}`)) !== null && _b !== void 0 ? _b : Infinity); });
        const current = openSet.shift();
        if (current.x === endTile.x && current.y === endTile.y) {
            return reconstructPath(cameFrom, current);
        }
        closedSet.add(`${current.x},${current.y}`);
        for (const neighbor of getNeighbors(current, validTiles, width, height, agentsSet)) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (closedSet.has(neighborKey))
                continue;
            const tentativeGScore = ((_a = gScore.get(`${current.x},${current.y}`)) !== null && _a !== void 0 ? _a : Infinity) + 1;
            if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + manhattanDistance(neighbor, endTile));
                if (!openSet.some(t => t.x === neighbor.x && t.y === neighbor.y)) {
                    openSet.push(neighbor);
                }
            }
        }
    }
    throw new Error(`No path found, from ${JSON.stringify(startPos)} to ${JSON.stringify(endPos)}`);
}
function manhattanDistance(posA, posB) {
    return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
}
function getNeighbors(tile, validTiles, width, height, obstacles) {
    const neighbors = [];
    const directions = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 }
    ];
    for (const { dx, dy } of directions) {
        const nx = tile.x + dx;
        const ny = tile.y + dy;
        const neighborKey = `${nx},${ny}`;
        const neighbor = validTiles.get(neighborKey);
        if (neighbor && !obstacles.has(neighborKey) && nx >= 0 && nx < width && ny >= 0 && ny < height) {
            neighbors.push(neighbor);
        }
    }
    return neighbors;
}
function reconstructPath(cameFrom, current) {
    const path = [current];
    let curKey = `${current.x},${current.y}`;
    while (cameFrom.has(curKey)) {
        current = cameFrom.get(curKey);
        path.unshift(current);
        curKey = `${current.x},${current.y}`;
    }
    return path;
}
function getVisitedTilesFromPlan(startPos, plan, mapConfig) {
    const visitedTiles = [];
    let currentPos = { x: startPos.x, y: startPos.y };
    for (const action of plan) {
        switch (action) {
            case types_1.atomicActions.moveUp:
                currentPos = { x: currentPos.x, y: currentPos.y - 1 };
                break;
            case types_1.atomicActions.moveDown:
                currentPos = { x: currentPos.x, y: currentPos.y + 1 };
                break;
            case types_1.atomicActions.moveLeft:
                currentPos = { x: currentPos.x - 1, y: currentPos.y };
                break;
            case types_1.atomicActions.moveRight:
                currentPos = { x: currentPos.x + 1, y: currentPos.y };
                break;
            default:
                break;
        }
        visitedTiles.push(mapConfig.tiles.find(tile => tile.x === currentPos.x && tile.y === currentPos.y));
    }
    return visitedTiles;
}
function getOptimalPath(startPos, endPos, mapConfig, beliefs) {
    if (startPos.x === endPos.x && startPos.y === endPos.y)
        return [];
    const agents = beliefs.getBelief(`agents`) || [];
    const obstacles = agents
        .filter(agent => agent.x !== startPos.x || agent.y !== startPos.y)
        .map(agent => ({ x: agent.x, y: agent.y }));
    try {
        const path = aStarPath(startPos, endPos, mapConfig, obstacles);
        return path;
    }
    catch (e) {
        if (e instanceof Error) {
            console.error("Error in pathfinding:", e.message); // just the message, no stack trace
        }
        else {
            console.error(String(e)); // fallback for non-Error objects
        }
        return [];
    }
}
function convertPathToActions(path) {
    const actions = [];
    for (let i = 0; i < path.length - 1; i++) {
        const current = path[i];
        const next = path[i + 1];
        if (next.x > current.x)
            actions.push(types_1.atomicActions.moveRight);
        else if (next.x < current.x)
            actions.push(types_1.atomicActions.moveLeft);
        else if (next.y > current.y)
            actions.push(types_1.atomicActions.moveUp);
        else if (next.y < current.y)
            actions.push(types_1.atomicActions.moveDown);
    }
    return actions;
}

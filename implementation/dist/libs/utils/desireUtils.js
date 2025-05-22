"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeForPath = exports.getCenterDirectionTilePosition = exports.getNearestDeliverySpot = exports.getNearestParcel = void 0;
exports.selectBestExplorationTile = selectBestExplorationTile;
const pathfinding_1 = require("./pathfinding");
const mapUtils_1 = require("./mapUtils");
const common_1 = require("./common");
const config_1 = require("../../config");
const getNearestParcel = ({ beliefs }) => {
    const parcels = beliefs.getBelief("visibleParcels");
    const curPos = beliefs.getBelief("position");
    const map = beliefs.getBelief("map");
    const agentId = beliefs.getBelief("id");
    if (!parcels || !curPos || !map || !agentId)
        throw new Error("Missing beliefs");
    const [firstParcel, ...rest] = parcels.filter(p => !p.carriedBy);
    if (!firstParcel)
        return null;
    const pathToFirst = (0, pathfinding_1.convertPathToActions)((0, pathfinding_1.getOptimalPath)(curPos, { x: firstParcel.x, y: firstParcel.y }, map, beliefs));
    let minLength;
    let minParcel;
    let minPath;
    if (pathToFirst != null) {
        minLength = pathToFirst.length;
        minParcel = firstParcel;
        minPath = pathToFirst;
    }
    else {
        minLength = Infinity;
        minParcel = null;
        minPath = null;
    }
    for (const parcel of rest) {
        const path = (0, pathfinding_1.convertPathToActions)((0, pathfinding_1.getOptimalPath)(curPos, { x: parcel.x, y: parcel.y }, map, beliefs));
        if (path == null)
            continue;
        const length = path.length;
        if (length < minLength) {
            minLength = length;
            minParcel = parcel;
            minPath = path;
        }
    }
    if (minParcel == null || minPath == null)
        return null;
    return { parcel: minParcel, path: minPath, time: (0, exports.timeForPath)({ path: minPath }).time };
};
exports.getNearestParcel = getNearestParcel;
const getNearestDeliverySpot = ({ startPosition, beliefs }) => (0, mapUtils_1.getDeliverySpot)(startPosition, 0, beliefs);
exports.getNearestDeliverySpot = getNearestDeliverySpot;
const getCenterDirectionTilePosition = (nStep, position, beliefs) => {
    const map = beliefs.getBelief("map");
    if (!map)
        throw new Error("Missing map");
    const center = {
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
            if (!tile)
                continue;
            const distance = Math.abs(x - center.x) + Math.abs(y - center.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestTile = { x, y };
            }
        }
    }
    center.x = closestTile.x;
    center.y = closestTile.y;
    const agents = beliefs.getBelief("agents") || [];
    const obstacles = agents
        .filter(agent => agent.x !== position.x || agent.y !== position.y)
        .map(agent => ({ x: agent.x, y: agent.y }));
    const path = (0, pathfinding_1.aStarPath)(position, center, map, obstacles);
    if (!path || path.length === 0) {
        throw new Error(`No path found from (${position.x},${position.y}) to map center`);
    }
    const stepIndex = Math.min(nStep, path.length - 1);
    const targetTile = path[stepIndex];
    return { x: targetTile.x, y: targetTile.y };
};
exports.getCenterDirectionTilePosition = getCenterDirectionTilePosition;
const timeForPath = ({ path }) => {
    const movementSpeed = (0, common_1.getConfig)("MOVEMENT_DURATION");
    if (!movementSpeed)
        throw new Error("MOVEMENT_DURATION not found");
    return { time: path.length * movementSpeed };
};
exports.timeForPath = timeForPath;
function computeExplorationScores(beliefs, maxAge, maxDistance) {
    const mapTypes = beliefs.getBelief("mapTypes");
    const map = beliefs.getBelief("map");
    const lastVisited = beliefs.getBelief("lastVisited");
    const currentPosition = beliefs.getBelief("position");
    const visionRange = (0, common_1.getConfig)("AGENTS_OBSERVATION_DISTANCE");
    const currentTime = Date.now();
    const { height, width } = map;
    // Step 1: Mark currently visible tiles
    const visible = Array.from({ length: width }, () => Array(height).fill(false));
    for (let dx = -visionRange; dx <= visionRange; dx++) {
        for (let dy = -visionRange; dy <= visionRange; dy++) {
            const nx = currentPosition.x + dx;
            const ny = currentPosition.y + dy;
            if (nx >= 0 && ny >= 0 &&
                nx < width && ny < height &&
                Math.abs(dx) + Math.abs(dy) <= visionRange) {
                visible[nx][ny] = true;
            }
        }
    }
    // Step 2: Compute exploration scores
    const scores = Array.from({ length: width }, () => Array(height).fill(0));
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            // Skip non-traversable tiles
            if (mapTypes[x][y] !== 1)
                continue;
            const dx = x - currentPosition.x;
            const dy = y - currentPosition.y;
            const distance = Math.abs(dx) + Math.abs(dy);
            if (distance > maxDistance || visible[x][y])
                continue;
            let age;
            if (lastVisited[x][y] === -Infinity) {
                // Tile has never been visited — give it maximum age
                age = Number.MAX_SAFE_INTEGER;
            }
            else {
                age = currentTime - lastVisited[x][y];
            }
            if (age > maxAge) {
                scores[x][y] = age / (distance + 1); // +1 to avoid division by zero
            }
        }
    }
    return scores;
}
function selectBestExplorationTile(beliefs, currentPos) {
    const scores = computeExplorationScores(beliefs, config_1.MAX_AGE_EXPLORATION, config_1.MAX_DISTANCE_EXPLORATION);
    const distances = beliefs.getBelief("dist");
    const mapWidth = scores[0].length;
    const currentIndex = (0, mapUtils_1.getTileIndex)(currentPos, mapWidth);
    let bestTile = null;
    let bestScore = -1;
    let bestDist = Infinity;
    for (let y = 0; y < scores.length; y++) {
        for (let x = 0; x < scores[0].length; x++) {
            const tile = { x, y };
            const score = scores[x][y];
            if (score <= 0)
                continue;
            // console.log("Tile", tile, "has score", score);
            const targetIndex = (0, mapUtils_1.getTileIndex)(tile, mapWidth);
            const dist = distances[currentIndex][targetIndex];
            if (score > bestScore ||
                (score === bestScore && dist < bestDist)) {
                bestScore = score;
                bestDist = dist;
                bestTile = tile;
            }
        }
    }
    if (bestTile === null) {
        console.log("No valid tile found for exploration");
        return null;
    }
    console.log("Best tile to explore", bestTile, "with score", bestScore, "and distance", bestDist);
    return bestTile;
}

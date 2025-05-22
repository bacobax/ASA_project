"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMinDistance = void 0;
exports.getKeyPos = getKeyPos;
exports.getKeyTile = getKeyTile;
exports.getTileIndex = getTileIndex;
exports.getTilePosition = getTilePosition;
exports.getDeliverySpot = getDeliverySpot;
function getKeyPos(pos) {
    return `${pos.x},${pos.y}`;
}
function getKeyTile(tile) {
    return `${tile.x},${tile.y}`;
}
function getTileIndex(pos, mapWidth) {
    return pos.y * mapWidth + pos.x;
}
function getTilePosition(index, mapWidth) {
    return { y: Math.floor(index / mapWidth), x: index % mapWidth };
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
    return {
        position: minDistancePos,
        distance: minDistance
    };
}
const getMinDistance = ({ startPosition, endPosition, beliefs }) => {
    const distances = beliefs.getBelief("dist");
    const map = beliefs.getBelief("map");
    return distances[getTileIndex(startPosition, map.width)][getTileIndex(endPosition, map.width)];
};
exports.getMinDistance = getMinDistance;

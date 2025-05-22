"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePickup = handlePickup;
exports.handleDeliver = handleDeliver;
exports.handleMove = handleMove;
const types_1 = require("../types/types");
const mapUtils_1 = require("./utils/mapUtils");
const pathfinding_1 = require("./utils/pathfinding");
const planUtils_1 = require("./utils/planUtils");
function handlePickup(intention, beliefs) {
    var _a;
    const curPos = beliefs.getBelief("position");
    const map = beliefs.getBelief("map");
    const strategy = beliefs.getBelief("strategy");
    if (!intention.possilbeParcels || intention.possilbeParcels.length === 0) {
        console.error("No parcels available for pickup");
        return { path: [], intention: intention };
    }
    const sorted = intention.possilbeParcels
        .map(p => {
        const tilesOnPath = (0, pathfinding_1.getOptimalPath)(curPos, { x: p.x, y: p.y }, map, beliefs);
        const path = (0, pathfinding_1.convertPathToActions)(tilesOnPath);
        return Object.assign(Object.assign({}, p), { distance: path ? path.length : Infinity, path: path !== null && path !== void 0 ? path : null, tilesOnPath: tilesOnPath });
    })
        .sort((0, planUtils_1.parcelsCompare)(strategy));
    const bestPlanParcel = sorted[0];
    const bestPlan = bestPlanParcel.path;
    if (!bestPlan) {
        console.error("Error in pathfinding");
        return { path: [], intention: intention };
    }
    // console.log("Best plan", bestPlan);
    const parcels = beliefs.getBelief("visibleParcels");
    const carryingParcels = (_a = parcels === null || parcels === void 0 ? void 0 : parcels.filter(p => p.carriedBy === beliefs.getBelief("id"))) !== null && _a !== void 0 ? _a : [];
    if (carryingParcels.length > 0) {
        const tilesToVisit = bestPlanParcel.tilesOnPath;
        for (let i = 0; i < tilesToVisit.length; i++) {
            const tile = tilesToVisit[i];
            if (tile.type == 2) {
                const path = bestPlan.slice(0, i);
                path.push(types_1.atomicActions.drop);
                const intention = {
                    type: types_1.desireType.DELIVER,
                    position: { x: tile.x, y: tile.y }
                };
                return { path: path, intention: intention };
            }
        }
    }
    bestPlan.push(types_1.atomicActions.pickup);
    return { path: bestPlan, intention: intention };
}
function handleDeliver(intention, beliefs) {
    const curPos = beliefs.getBelief("position");
    const map = beliefs.getBelief("map");
    const deliveryPos = (0, mapUtils_1.getDeliverySpot)(curPos, 0, beliefs);
    console.log("Delivery pos", deliveryPos.position);
    const path = (0, pathfinding_1.convertPathToActions)((0, pathfinding_1.getOptimalPath)(curPos, deliveryPos.position, map, beliefs));
    if (!path) {
        console.error("Error in pathfinding");
        return { path: [], intention: intention };
    }
    path.push(types_1.atomicActions.drop);
    return { path: path, intention: intention };
}
function handleMove(intention, beliefs) {
    const curPos = beliefs.getBelief("position");
    const map = beliefs.getBelief("map");
    if (intention.position &&
        (intention.position.x !== curPos.x || intention.position.y !== curPos.y)) {
        const path = (0, pathfinding_1.convertPathToActions)((0, pathfinding_1.getOptimalPath)(curPos, intention.position, map, beliefs));
        if (!path) {
            console.error("Error in pathfinding");
            return { path: [], intention: intention };
        }
        return { path: path, intention: intention };
    }
    return { path: [], intention: intention };
}

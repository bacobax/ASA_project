"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesireGenerator = exports.getReachableParcels = void 0;
const types_1 = require("../types/types");
const desireUtils_1 = require("./utils/desireUtils");
const common_1 = require("./utils/common");
const mapUtils_1 = require("./utils/mapUtils");
const planUtils_1 = require("./utils/planUtils");
const getReachableParcels = ({ beliefs, filter }) => {
    const parcels = beliefs.getBelief("visibleParcels");
    const curPos = beliefs.getBelief("position");
    const map = beliefs.getBelief("map");
    const speed = (0, common_1.getConfig)("MOVEMENT_DURATION");
    if (!parcels || !curPos || !map || !speed)
        throw new Error("Missing beliefs");
    const uncarried = parcels.filter(p => !p.carriedBy && (!filter || filter(p)));
    const reachable = [];
    for (const parcel of uncarried) {
        const distance = (0, mapUtils_1.getMinDistance)({
            startPosition: curPos,
            endPosition: { x: parcel.x, y: parcel.y },
            beliefs,
        });
        const time = distance * speed;
        reachable.push({ parcel, time, distance });
    }
    return reachable;
};
exports.getReachableParcels = getReachableParcels;
const gainFromReachableParcel = (baseReward, baseDistance, beliefs, MOVEMENT_DURATION, DECAY_INTERVAL, carryingParcels) => ({ parcel, time: fromMeToParcelTime, distance: fromMeToParcelDistance }) => {
    const delivery = (0, desireUtils_1.getNearestDeliverySpot)({
        startPosition: { x: parcel.x, y: parcel.y },
        beliefs
    });
    const deliverytime = delivery.distance * MOVEMENT_DURATION;
    const totalTime = fromMeToParcelTime + deliverytime;
    const totalDistance = fromMeToParcelDistance + delivery.distance;
    const totalReward = [
        ...carryingParcels.map(p => Math.max(0, p.reward - Math.floor(totalTime / DECAY_INTERVAL))),
        Math.max(0, baseReward - Math.floor(totalTime / DECAY_INTERVAL))
    ].reduce((a, b) => a + b, 0);
    // console.log("Parcel:", parcel.id,"Reward:", parcel.reward, "Total Reward:", totalReward, "fromMeToParcelTime:", fromMeToParcelTime, "deliveryTime:", deliverytime, "totalTime:", totalTime);
    const strategy = beliefs.getBelief("strategy");
    const normalizedTotalReward = planUtils_1.rewardNormalizations[strategy](totalReward, totalDistance);
    const normalizedBaseReward = planUtils_1.rewardNormalizations[strategy](baseReward, baseDistance);
    return normalizedTotalReward - normalizedBaseReward;
};
/**
 * DesireGenerator class handles the generation of desires (intentions) based on the agent's beliefs
 * and current state. It implements a reward-based decision-making system for parcel delivery.
 */
class DesireGenerator {
    /**
     * Generates a list of desires based on current beliefs and state
     * @param beliefs Current belief base of the agent
     * @returns Array of intentions representing desires
     */
    /**
     * Generates all possible intentions based on the agent's current belief base.
     */
    generateDesires(beliefs) {
        var _a;
        console.log("-----Generating Desire Options-----");
        const desires = [];
        const parcels = beliefs.getBelief("visibleParcels");
        const curPos = beliefs.getBelief("position");
        const agentId = beliefs.getBelief("id");
        const carryingParcels = (_a = parcels === null || parcels === void 0 ? void 0 : parcels.filter(p => p.carriedBy === agentId)) !== null && _a !== void 0 ? _a : [];
        if (carryingParcels.length > 0) {
            // Try to pick up more if possible
            const additionalPickup = this.considerAdditionalPickup(parcels, beliefs, carryingParcels);
            if (additionalPickup)
                desires.push(additionalPickup);
            desires.push({ type: types_1.desireType.DELIVER });
            // Deliver what you're carrying
            //desires.push({ type: desireType.DELIVER });
        }
        else if (parcels && parcels.length > 0) {
            // Attempt pickup of available parcels
            const pickupCandidates = parcels.filter(p => p.x !== curPos.x || p.y !== curPos.y);
            if (pickupCandidates.length > 0) {
                desires.push({
                    type: types_1.desireType.PICKUP,
                    possilbeParcels: pickupCandidates,
                });
            }
        }
        // Always have a fallback desire to explore
        let tileToExplore = (0, desireUtils_1.selectBestExplorationTile)(beliefs, curPos);
        if (!tileToExplore) {
            tileToExplore = (0, mapUtils_1.getDeliverySpot)(curPos, 3, beliefs).position;
        }
        desires.push({
            type: types_1.desireType.MOVE,
            position: tileToExplore
        });
        return desires;
    }
    considerAdditionalPickup(parcels, beliefs, carryingParcels) {
        const reachableParcels = (0, exports.getReachableParcels)({ beliefs });
        const DECAY_INTERVAL = (0, common_1.getConfig)("PARCEL_DECADING_INTERVAL");
        const MOVEMENT_DURATION = (0, common_1.getConfig)("MOVEMENT_DURATION");
        if (!DECAY_INTERVAL || !MOVEMENT_DURATION)
            return null;
        if (reachableParcels.length === 0)
            return null;
        const deliverySpot = (0, desireUtils_1.getNearestDeliverySpot)({
            startPosition: beliefs.getBelief("position"),
            beliefs,
        });
        const baseDeliveryTime = deliverySpot.distance * MOVEMENT_DURATION;
        const baseDistance = deliverySpot.distance; // Assuming this is the distance from the current position to the delivery spo
        const baseReward = carryingParcels.reduce((acc, p) => acc + Math.max(0, p.reward - Math.floor(baseDeliveryTime / DECAY_INTERVAL)), 0);
        let bestParcel = null;
        let bestGain = -Infinity;
        console.log("Base reward:", baseReward);
        const gainFunction = gainFromReachableParcel(baseReward, baseDistance, beliefs, MOVEMENT_DURATION, DECAY_INTERVAL, carryingParcels);
        for (const reachableParcel of reachableParcels) {
            const gain = gainFunction(reachableParcel);
            if (gain > 0 && gain > bestGain) {
                bestGain = gain;
                bestParcel = reachableParcel.parcel;
            }
        }
        const possileParcels = reachableParcels.filter(RP => gainFunction(RP) > 0).map(RP => RP.parcel);
        return bestParcel
            ? {
                type: types_1.desireType.PICKUP,
                possilbeParcels: possileParcels,
            }
            : null;
    }
}
exports.DesireGenerator = DesireGenerator;

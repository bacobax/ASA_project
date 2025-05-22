"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardNormalizations = exports.sophisticatedReward = exports.aggressiveReward = exports.linearReward = exports.parcelsCompare = void 0;
exports.evaluateParcelComboPlan = evaluateParcelComboPlan;
const config_1 = require("../../config");
const desireUtils_1 = require("../utils/desireUtils");
const common_1 = require("./common");
function evaluateParcelComboPlan(steps, decayInterval) {
    let time = 0;
    let score = 0;
    for (const step of steps) {
        const pathTime = (0, desireUtils_1.timeForPath)({ path: step.path }).time;
        time += pathTime;
        if (step.action === "deliver") {
            score += step.parcel.reward * Math.exp(-time / decayInterval);
        }
    }
    return { score, totalTime: time };
}
const parcelsCompare = (strategy) => {
    return (a, b) => {
        const priorityA = a.distance !== Infinity ? exports.rewardNormalizations[strategy](a.reward, a.distance) : 0;
        const priorityB = b.distance !== Infinity ? exports.rewardNormalizations[strategy](b.reward, b.distance) : 0;
        return priorityB - priorityA;
    };
};
exports.parcelsCompare = parcelsCompare;
const linearReward = (reward, distance, rewardWeight = config_1.REWARD_WEIGHT, distanceWeight = config_1.DISTANCE_WEIGHT) => {
    return (reward * rewardWeight) / (distance * distanceWeight);
};
exports.linearReward = linearReward;
const aggressiveReward = (reward, distance, distanceWeight = config_1.AGGRESSIVE_DISTANCE_WEIGHT) => {
    return reward / distance ^ distanceWeight;
};
exports.aggressiveReward = aggressiveReward;
const sophisticatedReward = (reward, distance, rewardWeight = config_1.S_REWARD_WEIGHT, distanceWeight = config_1.S_DISTANCE_WEIGHT) => {
    return (reward ^ rewardWeight) / (distance ^ distanceWeight);
};
exports.sophisticatedReward = sophisticatedReward;
exports.rewardNormalizations = {
    [common_1.Strategies.aggressive]: exports.aggressiveReward,
    [common_1.Strategies.linear]: exports.linearReward,
    [common_1.Strategies.sophisticated]: exports.sophisticatedReward,
};

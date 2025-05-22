"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desireType = exports.atomicActions = void 0;
var atomicActions;
(function (atomicActions) {
    atomicActions["moveRight"] = "moveRight";
    atomicActions["moveLeft"] = "moveLeft";
    atomicActions["moveUp"] = "moveUp";
    atomicActions["moveDown"] = "moveDown";
    atomicActions["pickup"] = "pickup";
    atomicActions["drop"] = "drop";
    atomicActions["wait"] = "wait";
})(atomicActions || (exports.atomicActions = atomicActions = {}));
var desireType;
(function (desireType) {
    desireType["PICKUP"] = "pickup";
    desireType["DELIVER"] = "deliver";
    desireType["MOVE"] = "move";
})(desireType || (exports.desireType = desireType = {}));

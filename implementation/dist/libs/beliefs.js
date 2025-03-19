"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeliefBase = void 0;
class BeliefBase {
    constructor() {
        this.beliefs = new Map();
    }
    updateBelief(key, value) {
        //console.log("Updating belief", key, value);
        this.beliefs.set(key, value);
    }
    getBelief(key) {
        return this.beliefs.get(key);
    }
    hasBelief(key) {
        return this.beliefs.has(key);
    }
    removeBelief(key) {
        this.beliefs.delete(key);
    }
}
exports.BeliefBase = BeliefBase;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentionManager = void 0;
class IntentionManager {
    constructor() {
        this.intentions = [];
    }
    adoptIntention(intention) {
        this.intentions.push(intention);
    }
    dropIntention(intention) {
        this.intentions = this.intentions.filter(i => i !== intention);
    }
    reviseIntentions(beliefs) {
        this.intentions = this.intentions.filter(intention => {
            var _a;
            if (intention.type === "pickup") {
                return (_a = beliefs.getBelief("visibleParcels")) === null || _a === void 0 ? void 0 : _a.some(p => p.id === intention.parcelId);
            }
            if (intention.type === "deliver") {
                return beliefs.hasBelief("carryingParcels") && beliefs.getBelief("carryingParcels").length > 0;
            }
            return true;
        });
    }
    getCurrentIntention() {
        return this.intentions.length > 0 ? this.intentions[0] : null;
    }
    hasIntentions() {
        return this.intentions.length > 0;
    }
}
exports.IntentionManager = IntentionManager;

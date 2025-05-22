"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentionManager = void 0;
const types_1 = require("../types/types");
class IntentionManager {
    constructor() {
        this.activeIntention = null;
        this.archivedIntentions = [];
    }
    adoptIntention(intention) {
        if (this.activeIntention && this.areIntentionsEqual(this.activeIntention, intention)) {
            return; // No need to adopt again
        }
        this.activeIntention = intention;
    }
    dropCurrentIntention() {
        if (this.activeIntention) {
            this.archivedIntentions.push(this.activeIntention);
            this.activeIntention = null;
        }
    }
    reviseIntentions(beliefs) {
        var _a, _b;
        if (!this.activeIntention)
            return;
        const intention = this.activeIntention;
        if (intention.type === types_1.desireType.PICKUP) {
            const visibleParcels = (_a = beliefs.getBelief("visibleParcels")) === null || _a === void 0 ? void 0 : _a.filter(p => p.carriedBy == null);
            if (!(visibleParcels === null || visibleParcels === void 0 ? void 0 : visibleParcels.some(p => p.id === intention.parcelId))) {
                this.dropCurrentIntention();
            }
        }
        if (intention.type === types_1.desireType.DELIVER) {
            const carried = beliefs.getBelief("carryingParcels") || [];
            if (carried.length === 0) {
                this.dropCurrentIntention();
            }
        }
        if (intention.type === types_1.desireType.MOVE) {
            const visibleParcels = (_b = beliefs.getBelief("visibleParcels")) === null || _b === void 0 ? void 0 : _b.filter(p => p.carriedBy == null);
            if ((visibleParcels === null || visibleParcels === void 0 ? void 0 : visibleParcels.length) && visibleParcels.length > 0) {
                this.dropCurrentIntention();
            }
            const pos = beliefs.getBelief("position");
            if (intention.position && pos.x === intention.position.x && pos.y === intention.position.y) {
                this.dropCurrentIntention();
            }
        }
    }
    getCurrentIntention() {
        return this.activeIntention;
    }
    hasIntentions() {
        return this.activeIntention !== null;
    }
    areIntentionsEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b); // structural equality
    }
}
exports.IntentionManager = IntentionManager;

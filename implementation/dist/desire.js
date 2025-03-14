"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesireGenerator = void 0;
class DesireGenerator {
    generateDesires(beliefs) {
        let desires = [];
        const parcels = beliefs.getBelief("visibleParcels");
        if (parcels) {
            for (let parcel of parcels) {
                desires.push({ type: "pickup", parcelId: parcel.id, x: parcel.x, y: parcel.y });
            }
        }
        const carryingParcels = beliefs.getBelief("carryingParcels");
        if (carryingParcels && carryingParcels.length > 0) {
            desires.push({ type: "deliver" });
        }
        return desires;
    }
}
exports.DesireGenerator = DesireGenerator;

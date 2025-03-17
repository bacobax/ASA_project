"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesireGenerator = void 0;
const utils_1 = require("./utils");
class DesireGenerator {
    generateDesires(beliefs) {
        console.log("-----Generating Desires-----");
        let desires = [];
        const parcels = beliefs.getBelief("visibleParcels");
        const carryingParcels = parcels === null || parcels === void 0 ? void 0 : parcels.filter(parcel => parcel.carriedBy == beliefs.getBelief("id"));
        if (carryingParcels && carryingParcels.length > 0) {
            console.log("Desire pushed - deliver");
            desires.push({ type: "deliver" });
        }
        if (parcels) {
            for (let parcel of parcels) {
                console.log("Desire pushed - pickup:", parcel);
                desires.push({ type: "pickup", parcelId: parcel.id, position: { x: parcel.x, y: parcel.y } });
            }
        }
        if (desires.length == 0) {
            console.log("Desire pushed - move");
            desires.push({ type: "move", position: (0, utils_1.getDeliverySpot)(beliefs.getBelief("position"), 3, beliefs) });
        }
        return desires;
    }
}
exports.DesireGenerator = DesireGenerator;

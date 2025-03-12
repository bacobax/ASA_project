import GoPickUp from "./utils/plans/GoPickUp.js";
import BlindMove from "./utils/plans/BlindMove.js";


const store = [
    {
        plans: [new GoPickUp(), new BlindMove()],
        me: {},
        parcels: []
    }
]


export default store;
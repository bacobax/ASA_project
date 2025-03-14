import Intention from "../Intention.js";

class Plan {
    stop() {
        console.log("stop plan and all sub intentions");
        for (const i of this.#sub_intentions) {
            i.stop();
        }
    }

    #sub_intentions = [];

    async subIntention(desire, agent, plans, ...args) {
        const sub_intention = new Intention(desire, plans, agent, ...args);
        this.#sub_intentions.push(sub_intention);
        try {
            await sub_intention.achieve();
            return true;
        } catch (e) {
            console.log("sub intention error", e);
            return false;
        }
    }
}
export default Plan;

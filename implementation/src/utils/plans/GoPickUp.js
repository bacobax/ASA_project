import Plan from "./Plan.js";
import BlindMove from "./BlindMove.js";

export default class GoPickUp extends Plan {
    isApplicableTo(desire) {
        return desire == "go_pick_up";
    }

    async execute({ x, y }, agent) {
        console.log(
            "__________________________exec GO_PICK_UP__________________________"
        );
        if (
            await this.subIntention("go_to", agent, [new BlindMove()], {
                x,
                y,
            })
        ) {
            await agent.client.pickup();
        } else {
            throw new Error("GO_PICK_UP error");
        }
    }
}

import Plan from "./Plan.js";

export default class BlindMove extends Plan {
    isApplicableTo(desire) {
        return desire == "go_to";
    }

    async execute({ x, y }, agent) {
        console.log(
            "__________________________exec GO_TO__________________________"
        );
        //console.log("knowledgeBase", agent.knowledgeBase);
        // while (agent.knowledgeBase.me.x != x || agent.knowledgeBase.me.y != y) {
        //     if (this.stopped) throw ["stopped"]; // if stopped then quit

        //     let status_x = false;
        //     let status_y = false;

        //     // this.log('me', me, 'xy', x, y);

        //     if (x > agent.knowledgeBase.me.x)
        //         status_x = await client.move("right");
        //     // status_x = await this.subIntention( 'go_to', {x: me.x+1, y: me.y} );
        //     else if (x < agent.knowledgeBase.me.x)
        //         status_x = await client.move("left");
        //     // status_x = await this.subIntention( 'go_to', {x: me.x-1, y: me.y} );

        //     if (status_x) {
        //         agent.knowledgeBase.me.x = status_x.x;
        //         agent.knowledgeBase.me.y = status_x.y;
        //     }

        //     if (this.stopped) throw ["stopped"]; // if stopped then quit

        //     if (y > agent.knowledgeBase.me.y)
        //         status_y = await client.move("up");
        //     // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y+1} );
        //     else if (y < agent.knowledgeBase.me.y)
        //         status_y = await client.move("down");
        //     // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y-1} );

        //     if (status_y) {
        //         agent.knowledgeBase.me.x = status_y.x;
        //         agent.knowledgeBase.me.y = status_y.y;
        //     }

        //     if (!status_x && !status_y) {
        //         this.log("stucked");
        //         throw "stucked";
        //     } else if (
        //         agent.knowledgeBase.me.x == x &&
        //         agent.knowledgeBase.me.y == y
        //     ) {
        //         // this.log('target reached');
        //     }
        // }

        // return true;
        console.log("END GO_TO");
        throw new Error("GO_TO is not implemented");
    }
}

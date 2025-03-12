import Plan from "./Plan.js";

export default class GoPickUp extends Plan {

    isApplicableTo ( desire ) {
        return desire == 'go_pick_up';
    }

    async execute ( {x, y} ) {
        // TODO move to x, y
        await this.subIntention( 'go_to', {x, y} );
        await client.pickup();
    }

}


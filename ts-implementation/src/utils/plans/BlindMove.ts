import Plan from './Plan.js';

export default class BlindMove extends Plan {

    isApplicableTo ( desire ) {
        return desire == 'go_to';
    }

    async execute ( {x, y} ) {
        while ( me.x != x || me.y != y ) {
            const dx = x - me.x;
            const dy = y - me.y;
            // TODO move right left up or down
        }

    }
}

import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import config from "./config.js";
import store from "./store.js";


const {host, token} = config;

const client = new DeliverooApi(
    host,
    token
)

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}



/**
 * Belief revision function
 */

const me = store[0].me;

const myAgent = new Agent();

client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
} )
const parcels = store[0].parcels;

client.onParcelsSensing( async ( perceived_parcels ) => {
    console.log("UPDATO PARCELS")
    for (const p of perceived_parcels) {
        parcels.set( p.id, p)
    }
} )



/**
 * BDI loop
 */

function agentLoop() {
    

    console.log("INIZIO AGENT LOOP")

    /**
     * Options
     */
    const options = [];
    for ( const [id, parcel] of parcels.entries() ) {
        if ( parcel.carriedBy ) continue;
        options.push( {
            desire: 'go_pick_up',
            args: [parcel]  
        } );
    }

    /**
     * Select best intention
     */
    let best_option;
    let nearest_distance = Number.MAX_VALUE;
    for ( const option of options ) {
        if ( option.desire != 'go_pick_up' ) continue;
        const [parcel] = option;
        const distance_to_option = distance( me, parcel );
        if ( distance_to_option < nearest_distance ) {
            best_option = option;
            nearest_distance = distance_to_option;
        }
    }


    /**
     * Revise/queue intention 
     */
    if ( best_option ) {
        myAgent.queue( best_option.desire, ...best_option.args );
    }
}

client.onParcelsSensing( agentLoop )
// client.onAgentsSensing( agentLoop )
// client.onYou( agentLoop )



import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYxMjFiODdiZDM1IiwibmFtZSI6InRlc3QiLCJpYXQiOjE3NDE3NzE5NTd9.5SHVk7Moc3zxqro5nZP8u3fsUfULSb22NwyCUcgGy6M'
)

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}



/**
 * Belief revision function
 */

const me = {};
client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
} )
const parcels = new Map();

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



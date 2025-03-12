import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { distance, process_cmd_args } from "./utils/utils";
import { default as config } from "../config.js";
import store from "./store.js";
import { init_sockets } from "./utils/sockets";
import { Agent } from "./utils/agent";

function init() {
    /**
     * Belief revision function
     */
    token = config.token;
    processed_token = process_cmd_args(["-token="]);
    if (processed_token.length == 1) {
        token = processed_token[0];
    }

    const client = new DeliverooApi(config.url, token);
    const myAgent = new Agent();

    client.onParcelsSensing(agentLoop);
}

/**
 * BDI loop
 */

function agentLoop() {
    console.log("INIZIO AGENT LOOP");

    /**
     * Options
     */
    const options = [];
    for (const [id, parcel] of parcels.entries()) {
        if (parcel.carriedBy) continue;
        options.push({
            desire: "go_pick_up",
            args: [parcel],
        });
    }

    /**
     * Select best intention
     */
    let best_option;
    let nearest_distance = Number.MAX_VALUE;
    for (const option of options) {
        if (option.desire != "go_pick_up") continue;
        const [parcel] = option;
        const distance_to_option = distance(me, parcel);
        if (distance_to_option < nearest_distance) {
            best_option = option;
            nearest_distance = distance_to_option;
        }
    }

    /**
     * Revise/queue intention
     */
    if (best_option) {
        myAgent.queue(best_option.desire, ...best_option.args);
    }
}

// client.onAgentsSensing( agentLoop )
// client.onYou( agentLoop )

init();

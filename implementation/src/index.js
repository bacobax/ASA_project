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

    const ClientAgent = new ClientAgent(token);
}

init();

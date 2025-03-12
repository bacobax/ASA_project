
import { distance, process_cmd_args } from "./utils/utils";
import { default as config } from "../config.js";
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

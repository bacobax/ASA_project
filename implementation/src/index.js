import { parseTokens } from "./utils/utils";

/**
 * Initialize Agent(s) and parse command line arguments
 */
function init() {
    singleAgent();
}

function singleAgent(config) {
    token = parseTokens(1)[0];
    // const ClientAgent = new ClientAgent(token, config); //PARAMETERS ARE WIP, config is WIP
}

function multiAgent(n_agents, configs) {
    if (n_agents != configs.length) {
        console.error(
            "Number of agents and number of configurations do not match"
        );
        return;
    }

    tokens = parseTokens(n_agents);
    const agents = [];
    for (let i = 0; i < n_agents; i++) {
        agents
            .push
            // new ClientAgent(tokens[i], configs[i]) //PARAMETERS ARE WIP, config is WIP
            ();
    }
}

init();

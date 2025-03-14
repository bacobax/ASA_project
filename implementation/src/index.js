import { parseTokens } from "./utils/utils.js";
import { baseOptionSelection, baseOptionCollection } from "./utils/utils.js";
import GoPickUp from "./utils/plans/GoPickUp.js";
import BlindMove from "./utils/plans/BlindMove.js";
import Agent from "./utils/Agent.js";
function init() {
    singleAgent();
}

function singleAgent(config) {
    const token = parseTokens(1)[0];
    console.log({ token });
    const agent = new Agent({
        token: token,
        config: config,
        collectOptionsLogic: baseOptionCollection,
        selectOptionLogic: baseOptionSelection,
        plans: [new GoPickUp(), new BlindMove()],
    }); //PARAMETERS ARE WIP, config is WIP
    agent.intentionExectuionBusyWaiting();
}

function multiAgent(n_agents, configs) {
    if (n_agents != configs.length) {
        console.error(
            "Number of agents and number of configurations do not match"
        );
        return;
    }

    const tokens = parseTokens(n_agents);
    const agents = [];
    for (let i = 0; i < n_agents; i++) {
        agents.push(
            new Agent({
                token: tokens[i],
                config: configs[i],
                collectOptionsLogic: baseOptionCollection,
                selectOptionLogic: baseOptionSelection,
                plans: [GoPickUp, BlindMove],
            })
        ); //PARAMETERS ARE WIP, config is WIP
    }
}

init();

import { parseTokens } from "./utils/utils";
import ClientAgent, { KnowledgeBase, ClientAgentConfig } from "./utils/ClientAgent";
import { baseOptionSelection, baseOptionCollection } from "./utils/utils";
import GoPickUp from "./utils/plans/GoPickUp";
import BlindMove from "./utils/plans/BlindMove";

interface AgentConfig extends Omit<ClientAgentConfig, 'token' | 'collectOptionsLogic' | 'selectOptionLogic' | 'plans'> {
    debug?: boolean;
    maxRetries?: number;
}

function init(): void {
    singleAgent();
}

function singleAgent(config?: AgentConfig): void {
    const tokens = parseTokens(1);
    const token = tokens ? tokens[0] : null;
    if (!token) {
        throw new Error("No token available");
    }

    const clientAgent = new ClientAgent({
        token,
        config,
        collectOptionsLogic: baseOptionCollection,
        selectOptionLogic: baseOptionSelection,
        plans: [GoPickUp, BlindMove],
    });
    clientAgent.intentionExectuionBusyWaiting();
}

function multiAgent(n_agents: number, configs: AgentConfig[]): void {
    if (n_agents !== configs.length) {
        throw new Error("Number of agents and number of configurations do not match");
    }

    const tokens = parseTokens(n_agents);
    if (!tokens) {
        throw new Error("No tokens available");
    }

    const agents: ClientAgent[] = [];
    for (let i = 0; i < n_agents; i++) {
        agents.push(
            new ClientAgent({
                token: tokens[i],
                config: configs[i],
                collectOptionsLogic: baseOptionCollection,
                selectOptionLogic: baseOptionSelection,
                plans: [GoPickUp, BlindMove],
            })
        );
    }
}

init();

import { AgentBDI } from "./libs/agents";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import config from "./config";
import { playAgents, spawnAgents } from "./libs/utils/multiAgentUtils";
import { Strategies } from "./libs/utils/common";

const strategies = [
    Strategies.sophisticated,
    Strategies.linear,
    Strategies.aggressive,
]
// Get number of agents from command line arguments
const numAgents = process.argv.length > 1 ? parseInt(process.argv[2]) : 3;



const agents = spawnAgents({
    numAgents: numAgents,
    tokens: config.tokens,
    host: config.host,
    strategies: strategies,
})

playAgents(agents);


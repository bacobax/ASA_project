import { AgentBDI } from "./libs/agents";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import config from "./config";
import { spawnAgents } from "./libs/utils/multiAgentUtils";
import { Strategies } from "./libs/utils/common";

// const strategies = [
//     Strategies.sophisticated,
//     Strategies.linear,
//     Strategies.aggressive,
// ]
// Get number of agents from command line arguments
// const numAgents = process.argv.length > 1 ? parseInt(process.argv[2]) : 3;

spawnAgents({
    numAgents: 4,
    tokens: config.tokens,
    host: config.host,
    strategies: [Strategies.sophisticated, Strategies.linear, Strategies.aggressive, Strategies.sophisticated],
    teamIds: ["team-1", "team-1", "team-2", "team-2"],
    allowedTeamIdsPrints: ["team-1", "team-2"],
})
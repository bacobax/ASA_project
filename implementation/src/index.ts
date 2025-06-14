/****
 * Entry point for the multi-agent Deliveroo simulation.
 * Spawns multiple BDI agents with specific strategies and configurations.
 */

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

/**
 * Spawns 4 agents with predefined names, IDs, strategies, and team assignments.
 * Agents use either sophisticated or aggressive strategies and are split into two teams.
 */
spawnAgents({
    // numAgents: 4,
    numAgents: 2,
    tokens: config.tokens,
    host: config.host,
    names: ["MULTI_1", "MULTI_2", "MULTI_3", "MULTI_4"],
    ids: ["ab132c240d1", "b132c240d19", "132c240d19f", "32c240d19fc"],
    strategies: [
        Strategies.sophisticated,
        Strategies.aggressive,
        Strategies.sophisticated,
        Strategies.sophisticated,
    ],
    teamIds: ["team-1", "team-2", "team-2", "team-2"],
    allowedTeamIdsPrints: ["team-1", "team-2"],
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
const multiAgentUtils_1 = require("./libs/utils/multiAgentUtils");
const common_1 = require("./libs/utils/common");
const strategies = [
    common_1.Strategies.sophisticated,
    common_1.Strategies.linear,
    common_1.Strategies.aggressive,
];
// Get number of agents from command line arguments
const numAgents = process.argv.length > 1 ? parseInt(process.argv[2]) : 3;
(0, multiAgentUtils_1.spawnAgents)({
    numAgents: numAgents,
    tokens: config_1.default.tokens,
    host: config_1.default.host,
    strategies: strategies,
    teamIds: [...Array.from({ length: numAgents }, (_, i) => `team-${i}`)],
    allowedTeamIdsPrints: ["team-0", "team-1"],
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnAgents = void 0;
const child_process_1 = require("child_process");
// Spawns all agents in parallel child processes
const spawnAgents = ({ numAgents, tokens, host, strategies, teamIds = [], allowedTeamIdsPrints = [] }) => {
    for (let i = 0; i < numAgents; i++) {
        const token = tokens[i];
        const strategy = strategies[i];
        const teamId = teamIds[i] || "team-" + [i]; // fallback if not provided
        var allowedPrint;
        if (allowedTeamIdsPrints.length > 0 && allowedTeamIdsPrints.includes(teamId)) {
            allowedPrint = true;
        }
        else {
            allowedPrint = false;
        }
        spawnAgentProcess({ token, host, strategy, teamId, allowedPrint });
    }
};
exports.spawnAgents = spawnAgents;
// Spawns one agent in its own child process and logs output
const spawnAgentProcess = ({ token, host, strategy, teamId, allowedPrint }) => {
    const child = (0, child_process_1.spawn)(`node dist/libs/utils/agentSpawn.js host="${host}" token="${token}" strategy="${strategy}" teamId="${teamId}"`, { shell: true });
    if (allowedPrint) {
        child.stdout.on('data', data => {
            process.stdout.write(`${token.slice(-5)}: "${data.toString().trim()}"\n`);
        });
        child.stderr.on('data', data => {
            process.stderr.write(`${token.slice(-5)} [ERROR]: "${data.toString().trim()}"\n`);
        });
        child.on('close', code => {
            console.log(`${token.slice(-5)}: exited with code ${code}`);
        });
    }
};

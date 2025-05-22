import { AgentBDI } from "../agents";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Strategies } from "./common";
import { spawn } from 'child_process';

interface spawnAgentsProps {
  numAgents: number;
  tokens: string[];
  host: string;
  strategies: Strategies[];
  teamIds?: string[];
  allowedTeamIdsPrints?: string[];
}

interface spawnAgentProps {
  token: string;
  host: string;
  strategy: Strategies;
  teamId: string;
  allowedPrint?: boolean;
}

// Spawns all agents in parallel child processes
export const spawnAgents = ({ numAgents, tokens, host, strategies, teamIds = [], allowedTeamIdsPrints=[] }: spawnAgentsProps): void => {
  for (let i = 0; i < numAgents; i++) {
    const token = tokens[i];
    const strategy = strategies[i];
    const teamId = teamIds[i] || "team-"+[i]; // fallback if not provided

    var allowedPrint;
    if (allowedTeamIdsPrints.length > 0 && allowedTeamIdsPrints.includes(teamId)) {
        allowedPrint = true;
    }
    else {
        allowedPrint = false;
    }

    spawnAgentProcess({ token, host, strategy, teamId , allowedPrint });
  }
};

// Spawns one agent in its own child process and logs output
const spawnAgentProcess = ({ token, host, strategy, teamId , allowedPrint}: spawnAgentProps): void => {
  const child = spawn(
    `node dist/libs/utils/agentSpawn.js host="${host}" token="${token}" strategy="${strategy}" teamId="${teamId}"`,
    { shell: true }
  );

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

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
  ids: string[];
  names?: string[];
}

interface spawnAgentProps {
  token: string;
  host: string;
  strategy: Strategies;
  teamId: string;
  allowedPrint?: boolean;
  teammatesIds?: string[];
  id?: string;
  name?: string;
}

// Spawns all agents in parallel child processes
export const spawnAgents = ({ numAgents, tokens, host, strategies, ids, teamIds = [], allowedTeamIdsPrints=[], names }: spawnAgentsProps): void => {
  if (teamIds.length < numAgents) {
    for (let i = teamIds.length; i < numAgents; i++) {
      teamIds.push(i + "");
    }
  }

  var teamIdsSet: {[id: string]: string[]} = {};
  for (let i = 0; i < numAgents; i++) {
    const token = tokens[i];
    const strategy = strategies[i];
    const teamId = teamIds[i]; // fallback if not provided

    var allowedPrint;
    if (allowedTeamIdsPrints.length > 0 && allowedTeamIdsPrints.includes(teamId)) {
        allowedPrint = true;
    }
    else {
        allowedPrint = false;
    }


    let teammatesIds: string[] = [];

    if (teamIdsSet[teamId]) {
        teammatesIds = teamIdsSet[teamId];
    }
    else{
      for (let j = 0; j < numAgents; j++) {
          if (teamIds[j] === teamId) {
              teammatesIds.push(ids[j]);
          }

      }
      teamIdsSet[teamId] = teammatesIds;
    }

    // Remove the current agent from the list of teammates
    teammatesIds = teammatesIds.filter(id => id !== ids[i]);

    console.log(`Spawning agent ${ids[i]} with strategy ${strategy} in team ${teamId}, teammates: ${teammatesIds.join(', ')}`);


    spawnAgentProcess({
      token,
      host, 
      strategy,
      teamId,
      allowedPrint,
      teammatesIds,
      id: ids[i],
      name: names ? names[i] : undefined
    });
  }
};

const colors = [
  "\x1b[31m", // red
  "\x1b[32m", // green
  "\x1b[33m", // yellow
  "\x1b[34m", // blue
  "\x1b[35m", // magenta
  "\x1b[36m", // cyan
  "\x1b[91m", // bright red
  "\x1b[92m", // bright green
  "\x1b[93m", // bright yellow
  "\x1b[94m", // bright blue
  "\x1b[95m", // bright magenta
  "\x1b[96m", // bright cyan
];

const resetColor = "\x1b[0m";

function getColorByName(name: string): string {
  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}


const spawnAgentProcess = ({ token, host, strategy, teamId, teammatesIds = [], allowedPrint = false, id, name }: spawnAgentProps): void => {
  const teammatesArg = teammatesIds.join(',');
  const displayName = name || id || "agent";
  const color = getColorByName(displayName);

  const command = `node dist/libs/utils/agentSpawn.js host="${host}" token="${token}" strategy="${strategy}" teamId="${teamId}" teammatesIds="${teammatesArg}" id="${id}"`;

  const child = spawn(command, { shell: true });

  if (allowedPrint) {
    child.stdout.on('data', data => {
      process.stdout.write(`${color}${displayName}: "${data.toString().trim()}"${resetColor}\n`);
    });

    child.stderr.on('data', data => {
      process.stderr.write(`${color}${displayName} [ERROR]: "${data.toString().trim()}"${resetColor}\n`);
    });

    child.on('close', code => {
      console.log(`${color}${displayName}: exited with code ${code}${resetColor}`);
    });
  }
};

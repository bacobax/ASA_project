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
  teammatesIds?: string[];
}

// Spawns all agents in parallel child processes
export const spawnAgents = ({ numAgents, tokens, host, strategies, teamIds = [], allowedTeamIdsPrints=[] }: spawnAgentsProps): void => {
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
              teammatesIds.push(tokens[j].slice(-5));
          }

      }
      teamIdsSet[teamId] = teammatesIds;
    }

    // Remove the current agent from the list of teammates
    teammatesIds = teammatesIds.filter(id => id !== token.slice(-5));

    console.log(`Spawning agent ${token.slice(-5)} with strategy ${strategy} in team ${teamId}, teammates: ${teammatesIds.join(', ')}`);


    spawnAgentProcess({
      token,
      host, 
      strategy,
      teamId,
      allowedPrint,
      teammatesIds
    });
  }
};


const spawnAgentProcess = ({ token, host, strategy, teamId, teammatesIds = [], allowedPrint = false }: spawnAgentProps): void => {
  const teammatesArg = teammatesIds.join(',');

  const command = `node dist/libs/utils/agentSpawn.js host="${host}" token="${token}" strategy="${strategy}" teamId="${teamId}" teammatesIds="${teammatesArg}"`;

  const child = spawn(command, { shell: true });

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

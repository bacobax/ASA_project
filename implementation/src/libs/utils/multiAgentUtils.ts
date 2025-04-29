import { AgentBDI } from "../agents";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Strategies } from "./common";

interface spawnAgentsProps {
    numAgents: number;
    tokens: string[];
    host: string;
    strategies: Strategies[];
}

export const spawnAgents = ({numAgents,tokens,host, strategies}: spawnAgentsProps): AgentBDI[] => {
    const agents = []

    for(let i = 0; i < Math.min(numAgents,tokens.length); i++){
        const api = new DeliverooApi(host, tokens[i]);
        const agent = new AgentBDI(api, strategies[i]);
        agents.push(agent)
    }
    return agents
}

export const playAgents = (agents: AgentBDI[]) => {
    for(const agent of agents){
        agent.play()
    }
}
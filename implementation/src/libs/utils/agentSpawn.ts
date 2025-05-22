import { AgentBDI } from "../agents";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Strategies } from "./common";


const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [key, value] = arg.split('=');
    return [key, value];
  }));
  
  const api = new DeliverooApi(args.host, args.token);
  const agent = new AgentBDI(api, args.strategy as Strategies, args.teamId);
  agent.play();
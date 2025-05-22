import { AgentBDI } from "../agents";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Strategies } from "./common";

interface Args {
  host: string;
  token: string;
  strategy: string;
  teamId: string;
  teammatesIds: string[];
}

const argsRaw = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, value] = arg.split('=');
    return [key, value];
  })
);

const args: Args = {
  ...argsRaw,
  teammatesIds: argsRaw.teammatesIds?.split(',') ?? [],
} as Args;


const api = new DeliverooApi(args.host, args.token);
const agent = new AgentBDI(api, args.strategy as Strategies, args.teamId, args.teammatesIds);
agent.play();
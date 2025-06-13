import { AgentBDI } from "../agent";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Strategies } from "../utils/common";

/**
 * Interface representing the arguments required to spawn an agent.
 */
interface Args {
  host: string;
  token: string;
  strategy: string;
  teamId: string;
  teammatesIds: string[];
  id: string;
}

/**
 * Parses command line arguments of the form key=value into an object.
 */
const argsRaw = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, value] = arg.split('=');
    return [key, value];
  })
);

/**
 * Constructs the Args object from the parsed raw arguments,
 * ensuring teammatesIds is an array by splitting on commas.
 */
const args: Args = {
  ...argsRaw,
  teammatesIds: argsRaw.teammatesIds?.split(',') ?? [],
} as Args;

console.log({args})

/**
 * Instantiates the Deliveroo API client with the provided host and token.
 */
const api = new DeliverooApi(args.host, args.token);

/**
 * Creates a new AgentBDI instance with the given strategy, team, teammates, and id,
 * then starts the agent's behavior loop.
 */
const agent = new AgentBDI(api, args.strategy as Strategies, args.teamId, args.teammatesIds, args.id);
agent.play();
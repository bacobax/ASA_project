import { AgentBDI } from "./libs/agents";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import config from "./config";

const api = new DeliverooApi(config.host, config.tokens[0]);
const agent = new AgentBDI(api);

const api2 = new DeliverooApi(config.host, config.tokens[1]);
const agent2 = new AgentBDI(api2);

agent.play();
agent2.play();
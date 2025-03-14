import { AgentBDI } from "./agents";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import config from "./config";

const api = new DeliverooApi(config.host, config.tokens[0]);
const agent = new AgentBDI(api);
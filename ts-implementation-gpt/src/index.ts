import { AgentBDI } from "./agents";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const api = new DeliverooApi("http://localhost:8080", "your-token-here");
const agent = new AgentBDI(api);
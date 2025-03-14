import { AgentBDI } from "./agent";
import { DeliverooApi } from "./deliverooApi";

const api = new DeliverooApi("http://localhost:8080", "your-token-here");
const agent = new AgentBDI(api);
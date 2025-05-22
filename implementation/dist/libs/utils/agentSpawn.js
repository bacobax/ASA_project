"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agents_1 = require("../agents");
const deliveroo_js_client_1 = require("@unitn-asa/deliveroo-js-client");
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [key, value] = arg.split('=');
    return [key, value];
}));
const api = new deliveroo_js_client_1.DeliverooApi(args.host, args.token);
const agent = new agents_1.AgentBDI(api, args.strategy, args.teamId);
agent.play();

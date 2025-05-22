"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const agents_1 = require("../agents");
const deliveroo_js_client_1 = require("@unitn-asa/deliveroo-js-client");
const argsRaw = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [key, value] = arg.split('=');
    return [key, value];
}));
const args = Object.assign(Object.assign({}, argsRaw), { teammatesIds: (_b = (_a = argsRaw.teammatesIds) === null || _a === void 0 ? void 0 : _a.split(',')) !== null && _b !== void 0 ? _b : [] });
const api = new deliveroo_js_client_1.DeliverooApi(args.host, args.token);
const agent = new agents_1.AgentBDI(api, args.strategy, args.teamId, args.teammatesIds);
agent.play();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const agents_1 = require("./agents");
const deliveroo_js_client_1 = require("@unitn-asa/deliveroo-js-client");
const config_1 = __importDefault(require("./config"));
const api = new deliveroo_js_client_1.DeliverooApi(config_1.default.host, config_1.default.tokens[0]);
const agent = new agents_1.AgentBDI(api);

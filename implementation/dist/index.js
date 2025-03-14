"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agents_1 = require("./agents");
const deliveroo_js_client_1 = require("@unitn-asa/deliveroo-js-client");
const api = new deliveroo_js_client_1.DeliverooApi("http://localhost:8080", "your-token-here");
const agent = new agents_1.AgentBDI(api);

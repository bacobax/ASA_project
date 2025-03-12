import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { distance, process_cmd_args } from "./utils/utils";
import { default as config } from "../config.js";
import { Agent } from "./utils/agent";

export default class ClientAgent {
    _client;
    _agent;
    _knowledgeBase = {
        me: {},
        parcels: new Map(),
    };
    _plans;

    constructor({ token, collectOptionsLogic, selectOptionLogic, plans }) {
        this._client = new DeliverooApi(config.url, token);
        this._agent = new Agent();
        this._plans = plans;
        _initSocket({
            collectOptions: collectOptionsLogic,
            selectOption: selectOptionLogic,
        });
    }

    _initSocket({ collectOptions, selectOption }) {
        _client.onYou(({ id, name, x, y, score }) => {
            _knowledgeBase.me.id = id;
            _knowledgeBase.me.name = name;
            _knowledgeBase.me.x = x;
            _knowledgeBase.me.y = y;
            _knowledgeBase.me.score = score;
        });

        _client.onParcelsSensing(async (perceived_parcels) => {
            console.log("UPDATO PARCELS");
            for (const p of perceived_parcels) {
                _knowledgeBase.parcels.set(p.id, p);
            }
        });

        _client.onParcelsSensing(() => {
            console.log("INIZIO AGENT LOOP");

            const options = collectOptions(this._knowledgeBase);

            const bestOPT = selectOption(options);

            if (bestOPT) {
                this._agent.queue(bestOPT.desire, ...bestOPT.args);
            }
        });
    }

    intentionExectuionBusyWaiting() {
        this._agent.intentionLoop();
    }

    get client() {
        return this._client;
    }

    get agent() {
        return this._agent;
    }

    get store() {
        return this._knowledgeBase;
    }
}

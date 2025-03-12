import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import config from "../config.js";
import  Agent  from "./Agent.js";

/**
 *  Class for ClientAgent,
 *  which is responsible for managing the client, agent and knowledge base
 *  also manages the initialization of the socket
 */
export default class ClientAgent {
    _client;
    _agent;
    _knowledgeBase = {
        me: {},
        parcels: new Map(),
    };
    _plans;
   

    constructor({ token, collectOptionsLogic, selectOptionLogic, plans }) {
        this._client = new DeliverooApi(config.host, token);
        this._agent = new Agent();
        this._plans = plans;
        this._initSocket({
            collectOptions: collectOptionsLogic,
            selectOption: selectOptionLogic,
        });
    }

    /**
     *
     * @param {function} collectOptions
     * @param {function} selectOption
     * @returns {void}
     *
     * initializes the sockets and defines the callbacks for the agent loop
     * collectOptions: function that collects the options for the agent
     * selectOption: function that selects the best option for the agent
     */
    _initSocket({ collectOptions, selectOption }) {
        this._client.onYou(({ id, name, x, y, score }) => {
            this._knowledgeBase.me.id = id;
            this._knowledgeBase.me.name = name;
            this._knowledgeBase.me.x = x;
            this._knowledgeBase.me.y = y;
            this._knowledgeBase.me.score = score;
        });

        this._client.onParcelsSensing(async (perceived_parcels) => {
            console.log("UPDATO PARCELS");
            for (const p of perceived_parcels) {
                this._knowledgeBase.parcels.set(p.id, p);
            }
        });

        this._client.onParcelsSensing(() => {
            console.log("INIZIO AGENT LOOP");

            const options = collectOptions(this._knowledgeBase);
            console.log("OPTIONS: ", options);

            const bestOPT = selectOption(options, this._knowledgeBase);

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

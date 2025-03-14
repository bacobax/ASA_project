import Intention from "./Intention.js";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import config from "../config.js";

/**
 * Class for Agent,
 * which is responsible for managing the intentions of the agent
 */
export default class Agent {
    _client;
    _knowledgeBase = {
        me: {},
        parcels: new Map(),
    };
    _plans;

    /**
     * bisogna passare lista di possibili plans da passare a cascata alle itnentions
     */

    intention_queue = new Array();

    async intentionLoop() {
        while (true) {
            const intention = this.intention_queue.shift();
            if (intention) await intention.achieve();
            await new Promise((res) => setImmediate(res));
        }
    }
    /**
     * queue viene chiamata -> viene creata un'intenzione -> bisogna passare i piani all'intezione
     * @param {*} plans
     */
    constructor({ plans, token, collectOptionsLogic, selectOptionLogic }) {
        console.log("plans: ", plans);

        this._client = new DeliverooApi(config.host, token);
        this._plans = plans;
        this._initSocket({
            collectOptions: collectOptionsLogic,
            selectOption: selectOptionLogic,
        });

        this.intentionLoop();
    }

    async queue(desire, plans, ...args) {
        const current = new Intention(desire, plans, this, ...args);
        this.intention_queue.push(current);
    }

    async stop() {
        console.log("stop agent queued intentions");
        for (const intention of this.intention_queue) {
            intention.stop();
        }
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
            console.log("INIT AGENT");
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
            console.log("OPTIONS: ", JSON.stringify(options));

            const bestOPT = selectOption(options, this._knowledgeBase);
            console.log("BEST OPTION: ", JSON.stringify(bestOPT));
            if (bestOPT) {
                this.queue(bestOPT.desire, this._plans, ...bestOPT.args);
            }
        });
    }

    intentionExectuionBusyWaiting() {
        this.intentionLoop();
    }

    get client() {
        return this._client;
    }

    get knowledgeBase() {
        return this._knowledgeBase;
    }

    getKnowledgeBase() {
        return this._knowledgeBase;
    }
}

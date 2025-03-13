import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import config from "../config";
import Agent from "./Agent";
 
interface Position {
    x: number;
    y: number;
}

interface Parcel {
    id: string;
    x: number;
    y: number;
    carriedBy?: string;
}

export interface KnowledgeBase {
    me: {
        id?: string;
        name?: string;
        x?: number;
        y?: number;
        score?: number;
    };
    parcels: Map<string, Parcel>;
}

interface Option {
    desire: string;
    args: any[];
}

type Plan = (agent: Agent, ...args: any[]) => Promise<boolean>;

export interface ClientAgentConfig {
    token: string;
    collectOptionsLogic: (kb: KnowledgeBase) => Option[];
    selectOptionLogic: (options: Option[], kb: KnowledgeBase) => Option | undefined;
    plans: Plan[];
}

/**
 *  Class for ClientAgent,
 *  which is responsible for managing the client, agent and knowledge base
 *  also manages the initialization of the socket
 */
export default class ClientAgent {
    private _client: DeliverooApi;
    private _agent: Agent;
    private _knowledgeBase: KnowledgeBase = {
        me: {},
        parcels: new Map(),
    };
    private _plans: Plan[];

    constructor({ token, collectOptionsLogic, selectOptionLogic, plans }: ClientAgentConfig) {
        this._client = new DeliverooApi(config.host, token);
        this._agent = new Agent(plans);
        this._plans = plans;
        this._initSocket({
            collectOptions: collectOptionsLogic,
            selectOption: selectOptionLogic,
        });
    }

    private _initSocket({ collectOptions, selectOption }: {
        collectOptions: (kb: KnowledgeBase) => Option[];
        selectOption: (options: Option[], kb: KnowledgeBase) => Option | undefined;
    }): void {
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
                this._agent.queue(bestOPT.desire, this._plans, ...bestOPT.args);
            }
        });
    }

    intentionExectuionBusyWaiting(): void {
        this._agent.intentionLoop();
    }

    get client(): DeliverooApi {
        return this._client;
    }

    get agent(): Agent {
        return this._agent;
    }

    get store(): KnowledgeBase {
        return this._knowledgeBase;
    }
}

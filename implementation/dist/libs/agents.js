"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentBDI = void 0;
const beliefs_1 = require("./beliefs");
const desire_1 = require("./desire");
const intentions_1 = require("./intentions");
const planner_1 = require("./planner");
const pathfinding_1 = require("./utils/pathfinding");
const types_1 = require("../types/types");
const config_1 = require("../config");
const common_1 = require("./utils/common");
class AgentBDI {
    constructor(api, strategy, teamId) {
        this.beliefs = new beliefs_1.BeliefBase();
        this.desires = new desire_1.DesireGenerator();
        this.intentions = new intentions_1.IntentionManager();
        this.currentPlan = [];
        this.atomicActionToApi = new Map();
        this.isPlanRunning = false;
        this.planAbortSignal = false;
        this.startSemaphore = {
            onYou: false,
            onMap: false,
            onConfig: false,
        };
        this.beliefs.updateBelief("teamId", teamId);
        this.api = api;
        this.beliefs.updateBelief("strategy", strategy);
        console.log(`Strategy: ${strategy}`);
        this.initActionHandlers();
        this.setupSocketHandlers();
    }
    initActionHandlers() {
        this.atomicActionToApi.set(types_1.atomicActions.moveRight, api => api.move("right"));
        this.atomicActionToApi.set(types_1.atomicActions.moveLeft, api => api.move("left"));
        this.atomicActionToApi.set(types_1.atomicActions.moveUp, api => api.move("up"));
        this.atomicActionToApi.set(types_1.atomicActions.moveDown, api => api.move("down"));
        this.atomicActionToApi.set(types_1.atomicActions.pickup, api => api.pickup());
        this.atomicActionToApi.set(types_1.atomicActions.drop, api => api.putdown());
        this.atomicActionToApi.set(types_1.atomicActions.wait, (_) => __awaiter(this, void 0, void 0, function* () {
            yield new Promise(res => setTimeout(res, 1000));
            return true;
        }));
    }
    play() {
        const movementDuration = (0, common_1.getConfig)("MOVEMENT_DURATION");
        if (!this.startSemaphore.onYou || !this.startSemaphore.onMap || !this.startSemaphore.onConfig) {
            setTimeout(() => this.play(), 1000);
            return;
        }
        setInterval(() => this.deliberate().catch(console.error), movementDuration * 2);
    }
    setupSocketHandlers() {
        this.api.onYou(data => {
            const position = { x: Math.round(data.x), y: Math.round(data.y) };
            this.beliefs.updateBelief("position", position);
            let lastVisited = this.beliefs.getBelief("lastVisited");
            if (!lastVisited) {
                const map = this.beliefs.getBelief("map");
                if (map) {
                    let lastVisitedNew = new Array(map.width).fill(-Infinity).map(() => new Array(map.height).fill(-Infinity));
                    lastVisitedNew[position.x][position.y] = Date.now();
                    this.beliefs.updateBelief("lastVisited", lastVisitedNew);
                }
            }
            else {
                lastVisited[position.x][position.y] = Date.now();
                this.beliefs.updateBelief("lastVisited", lastVisited);
            }
            this.beliefs.updateBelief("id", data.id);
            this.beliefs.updateBelief("score", data.score);
            this.startSemaphore.onYou = true;
        });
        this.api.onParcelsSensing(parcels => {
            this.beliefs.updateBelief("visibleParcels", parcels);
            this.intentions.reviseIntentions(this.beliefs);
        });
        this.api.onAgentsSensing(agents => {
            var _a;
            this.beliefs.updateBelief("agents", agents);
            const timestamp = Date.now();
            for (const agent of agents) {
                const logs = (_a = this.beliefs.getBelief(agent.id)) !== null && _a !== void 0 ? _a : [];
                logs.push({ prevPosition: { x: agent.x, y: agent.y }, timestamp });
                this.beliefs.updateBelief(agent.id, logs);
            }
        });
        this.api.onMap((width, height, tiles) => {
            const validTiles = tiles.filter(t => t.type !== 0);
            let mapTypes = new Array(width).fill(0).map(() => new Array(height).fill(0));
            for (const tile of validTiles) {
                mapTypes[tile.x][tile.y] = tile.type;
            }
            const map = { width, height, tiles: validTiles };
            this.beliefs.updateBelief("map", map);
            this.beliefs.updateBelief("mapTypes", mapTypes);
            this.beliefs.updateBelief("deliveries", tiles.filter(tile => tile.type == 2));
            this.beliefs.updateBelief("spawnable", tiles.filter(tile => tile.type == 1));
            const { dist, prev, paths } = (0, pathfinding_1.floydWarshallWithPaths)(map);
            this.beliefs.updateBelief("dist", dist);
            this.beliefs.updateBelief("prev", prev);
            this.beliefs.updateBelief("paths", paths);
            this.startSemaphore.onMap = true;
        });
        this.api.onConfig(config => {
            const sanitized = (0, common_1.sanitizeConfigs)(config);
            console.log({ sanitized });
            (0, common_1.writeConfigs)(sanitized);
            this.startSemaphore.onConfig = true;
        });
    }
    deliberate() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.intentions.reviseIntentions(this.beliefs);
            const currentIntention = this.intentions.getCurrentIntention();
            if (!currentIntention || this.planAbortSignal) {
                if (this.isPlanRunning) {
                    this.stopCurrentPlan();
                }
                for (const desire of this.desires.generateDesires(this.beliefs)) {
                    const { path: plan = [], intention = null } = (_a = (0, planner_1.planFor)(desire, this.beliefs)) !== null && _a !== void 0 ? _a : {};
                    if ((plan === null || plan === void 0 ? void 0 : plan.length) && intention) {
                        this.intentions.adoptIntention(intention);
                        this.currentPlan = plan;
                        return this.executePlan();
                    }
                }
                console.warn("No viable plan found, including fallback.");
            }
        });
    }
    executePlan() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            if (this.isPlanRunning)
                return;
            this.isPlanRunning = true;
            this.planAbortSignal = false;
            try {
                const executor = (0, planner_1.createPlanExecutor)({
                    api: this.api,
                    plan: this.currentPlan,
                    actionMap: this.atomicActionToApi,
                    isMovingAndBlocked: this.isMovingAndAgentBlocking.bind(this),
                    shouldAbort: () => this.planAbortSignal,
                    waitTimeMs: (0, common_1.getConfig)("MOVEMENT_DURATION") || config_1.WAIT_FOR_AGENT_MOVE_ON,
                    maxRetries: config_1.MAX_BLOCK_RETRIES,
                });
                try {
                    for (var _d = true, executor_1 = __asyncValues(executor), executor_1_1; executor_1_1 = yield executor_1.next(), _a = executor_1_1.done, !_a; _d = true) {
                        _c = executor_1_1.value;
                        _d = false;
                        const step = _c;
                        console.log(`[Plan] Executed ${step.action} with status: ${step.status}`);
                        this.intentions.reviseIntentions(this.beliefs);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = executor_1.return)) yield _b.call(executor_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            catch (err) {
                if (err instanceof Error) {
                    console.error("Plan executor failed:", err.message); // just the message, no stack trace
                }
                else {
                    console.error(String(err)); // fallback for non-Error objects
                }
                this.stopCurrentPlan();
                const fallback = this.intentions.getCurrentIntention()
                    ? (0, planner_1.planFor)(this.intentions.getCurrentIntention(), this.beliefs)
                    : null;
                if (fallback) {
                    this.intentions.adoptIntention(fallback.intention);
                    this.currentPlan = fallback.path;
                    return this.executePlan();
                }
            }
            this.isPlanRunning = false;
            if (!this.planAbortSignal) {
                console.log("Plan execution completed.");
            }
        });
    }
    stopCurrentPlan() {
        console.log("Stopping plan.");
        this.planAbortSignal = true;
        this.isPlanRunning = false;
        this.currentPlan = [];
    }
    isMovingAndAgentBlocking(action) {
        var _a;
        if (action !== types_1.atomicActions.moveDown && action !== types_1.atomicActions.moveLeft && action !== types_1.atomicActions.moveRight && action !== types_1.atomicActions.moveUp) {
            return false;
        }
        const current = this.beliefs.getBelief("position");
        const map = this.beliefs.getBelief("map");
        if (!current || !map)
            throw new Error("Missing position or map");
        const delta = {
            [types_1.atomicActions.moveDown]: { x: 0, y: 1 },
            [types_1.atomicActions.moveLeft]: { x: -1, y: 0 },
            [types_1.atomicActions.moveRight]: { x: 1, y: 0 },
            [types_1.atomicActions.moveUp]: { x: 0, y: -1 }
        }[action];
        const target = { x: current.x + delta.x, y: current.y + delta.y };
        const agents = (_a = this.beliefs.getBelief("agents")) !== null && _a !== void 0 ? _a : [];
        return agents.some(a => a.x === target.x && a.y === target.y);
    }
}
exports.AgentBDI = AgentBDI;

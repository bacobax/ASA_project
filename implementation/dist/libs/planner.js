"use strict";
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planFor = void 0;
exports.createPlanExecutor = createPlanExecutor;
const types_1 = require("../types/types");
const plans_1 = require("./plans");
const planFor = (intention, beliefs) => {
    const handlers = {
        [types_1.desireType.PICKUP]: plans_1.handlePickup,
        [types_1.desireType.DELIVER]: plans_1.handleDeliver,
        [types_1.desireType.MOVE]: plans_1.handleMove,
    };
    const handler = handlers[intention.type];
    return handler ? handler(intention, beliefs) : undefined;
};
exports.planFor = planFor;
function createPlanExecutor(_a) {
    return __asyncGenerator(this, arguments, function* createPlanExecutor_1({ api, plan, actionMap, isMovingAndBlocked, maxRetries = 3, waitTimeMs = 1000, shouldAbort, }) {
        for (const action of plan) {
            const fn = actionMap.get(action);
            if (!fn) {
                console.warn(`Unknown action: ${action}`);
                continue;
            }
            let retries = 0;
            while (!shouldAbort()) {
                try {
                    const success = yield __await(fn(api));
                    if (success) {
                        yield yield __await({ action, status: "ok" });
                        break;
                    }
                    if (isMovingAndBlocked(action)) {
                        if (++retries >= maxRetries) {
                            yield yield __await({ action, status: "failed" });
                            throw new Error(`Max retries reached for ${action}`);
                        }
                        yield yield __await({ action, status: "retrying" });
                        yield __await(new Promise(res => setTimeout(res, waitTimeMs)));
                        continue;
                    }
                    throw new Error(`Action failed without blockage: ${action}`);
                }
                catch (err) {
                    throw err;
                }
            }
            if (shouldAbort())
                break;
        }
    });
}

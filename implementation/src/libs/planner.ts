import { BeliefBase } from "./beliefs";
import {
    atomicActions,
    desireType,
    Intention,
    Position,
    Agent,
    MapConfig,
} from "../types/types";
import {
    handlePickup,
    handleDeliver,
    handleMove,
    handleCourierDeliver,
    handleCourierMove,
    handleExplorerMove,
    handleExplorerPickup,
    handleCourierPickup,
    handleExplorerDeliver,
} from "./plans";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { getConfig } from "./utils/common";
import { TEST_DELAY_BETWEEN_ACTIONS } from "../config";

/**
 * Plans a sequence of atomic actions based on the given intention and current beliefs.
 *
 * @param {Intention} intention - The intention to plan for, specifying the desired goal.
 * @param {BeliefBase} beliefs - The current belief base providing the agent's knowledge of the world.
 * @returns {{ path: atomicActions[]; intention: Intention } | undefined} 
 *          An object containing the planned path of atomic actions and the possibly updated intention,
 *          or undefined if no suitable handler is found for the intention type.
 */
export const planFor = (
    intention: Intention,
    beliefs: BeliefBase
): { path: atomicActions[]; intention: Intention } | undefined => {
    const handlers: {
        [key in desireType]?: (
            intention: Intention,
            beliefs: BeliefBase
        ) => { path: atomicActions[]; intention: Intention };
    } = {
        [desireType.PICKUP]: handlePickup,
        [desireType.DELIVER]: handleDeliver,
        [desireType.MOVE]: handleMove,
        [desireType.COURIER_DELIVER]: handleCourierDeliver,
        [desireType.COURIER_MOVE]: handleCourierMove,
        [desireType.COURIER_PICKUP]: handleCourierPickup,
        [desireType.EXPLORER_DELIVER]: handleExplorerDeliver,
        [desireType.EXPLORER_MOVE]: handleExplorerMove,
        [desireType.EXPLORER_PICKUP]: handleExplorerPickup,
    };

    const handler = handlers[intention.type];
    return handler ? handler(intention, beliefs) : undefined;
};


/**
 * Options for configuring the plan executor.
 */
type PlanExecutorOptions = {
    /**
     * The Deliveroo API instance used to perform actions.
     */
    api: DeliverooApi;
    /**
     * The sequence of atomic actions to execute.
     */
    plan: atomicActions[];
    /**
     * A map from atomic actions to their corresponding execution functions.
     */
    actionMap: Map<atomicActions, (api: DeliverooApi) => Promise<boolean>>;
    /**
     * Function to check if a moving action is currently blocked.
     */
    isMovingAndBlocked: (action: atomicActions) => boolean;
    /**
     * Maximum number of retries for a blocked action before failing.
     * @default 3
     */
    maxRetries?: number;
    /**
     * Wait time in milliseconds between retries.
     * @default 1000
     */
    waitTimeMs?: number;
    /**
     * Function to determine if the execution should abort.
     */
    shouldAbort: () => boolean;
};

/**
 * Asynchronously executes a plan of atomic actions, yielding status updates for each action.
 *
 * The generator attempts to execute each action in the plan using the provided actionMap.
 * If an action fails due to blockage and is a moving action, it retries up to maxRetries times,
 * waiting waitTimeMs milliseconds between retries. Execution can be aborted early by shouldAbort.
 *
 * @param {PlanExecutorOptions} options - Configuration options for plan execution.
 * @yields {{ action: atomicActions; status: "ok" | "retrying" | "failed" }} 
 *          Status updates for each action indicating success, retry attempts, or failure.
 */
export async function* createPlanExecutor({
    api,
    plan,
    actionMap,
    isMovingAndBlocked,
    maxRetries = 3,
    waitTimeMs = 1000,
    shouldAbort,
}: PlanExecutorOptions): AsyncGenerator<
    { action: atomicActions; status: "ok" | "retrying" | "failed" },
    void,
    unknown
> {
    for (const action of plan) {
        const fn = actionMap.get(action);
        if (!fn) {
            console.warn(`Unknown action: ${action}`);
            continue;
        }

        let retries = 0;

        while (!shouldAbort()) {
            try {
                //*********************************** TEST ONLY */
                await new Promise((resolve) =>
                    setTimeout(resolve, TEST_DELAY_BETWEEN_ACTIONS)
                ); // test only purpose
                //*********************************** TEST ONLY */

                const success = await fn(api);

                if (success) {
                    yield { action, status: "ok" };
                    break;
                }

                if (isMovingAndBlocked(action)) {
                    if (++retries >= maxRetries) {
                        yield { action, status: "failed" };
                        throw new Error(`Max retries reached for ${action}`);
                    }
                    yield { action, status: "retrying" };
                    await new Promise((res) => setTimeout(res, waitTimeMs));
                    continue;
                }

                throw new Error(`Action failed without blockage: ${action}`);
            } catch (err) {
                throw err;
            }
        }

        if (shouldAbort()) break;
    }
}

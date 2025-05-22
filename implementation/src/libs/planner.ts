import { BeliefBase } from "./beliefs";
import { atomicActions, desireType, Intention ,Position, Agent, MapConfig} from "../types/types";
import { handlePickup, handleDeliver, handleMove, handleDeliverTeam, handlePickupTeam } from "./plans";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

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
      [desireType.PICKUP_TEAM]: handlePickupTeam,
      [desireType.DELIVER_TEAM]: handleDeliverTeam,
    };
  
    const handler = handlers[intention.type];
    return handler ? handler(intention, beliefs) : undefined;
  };


  type PlanExecutorOptions = {
      api: DeliverooApi;
      plan: atomicActions[];
      actionMap: Map<atomicActions, (api: DeliverooApi) => Promise<boolean>>;
      isMovingAndBlocked: (action: atomicActions) => boolean;
      maxRetries?: number;
      waitTimeMs?: number;
      shouldAbort: () => boolean;
  };
  
  export async function* createPlanExecutor({
      api,
      plan,
      actionMap,
      isMovingAndBlocked,
      maxRetries = 3,
      waitTimeMs = 1000,
      shouldAbort,
  }: PlanExecutorOptions): AsyncGenerator<{ action: atomicActions; status: "ok" | "retrying" | "failed" }, void, unknown> {
      for (const action of plan) {
          const fn = actionMap.get(action);
          if (!fn) {
              console.warn(`Unknown action: ${action}`);
              continue;
          }
  
          let retries = 0;
  
          while (!shouldAbort()) {
              try {
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
                      await new Promise(res => setTimeout(res, waitTimeMs));
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
import { BeliefBase } from "./beliefs";
import { atomicActions, desireType, Intention } from "../types/types";
import { handlePickup, handleDeliver, handleMove } from "./plans";

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
    };
  
    const handler = handlers[intention.type];
    return handler ? handler(intention, beliefs) : undefined;
  };

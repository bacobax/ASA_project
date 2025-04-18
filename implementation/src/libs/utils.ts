
import { Intention, desireType } from "../types/types";

export const intentionCompare = (a: Intention, b: Intention): number => {
    const priorities: { [key in desireType]: number } = {
        [desireType.PICKUP]: 1,
        [desireType.DELIVER]: 2,
        [desireType.MOVE]: 3,
    };
    const firstPriority = priorities[a.type];
    const secondPriority = priorities[b.type];

    return firstPriority - secondPriority;
};
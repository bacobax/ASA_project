import { Parcel } from "../../types/types";


export const parcelsCompare = (a: Parcel & {distance:number}, b: Parcel & {distance:number}) => {
    const REWARD_WEIGHT = 1.5;
    const DISTANCE_WEIGHT = 1.0;
    const priorityA = a.distance !== Infinity ? (a.reward * REWARD_WEIGHT) / (a.distance * DISTANCE_WEIGHT) : 0;
    const priorityB = b.distance !== Infinity ? (b.reward * REWARD_WEIGHT) / (b.distance * DISTANCE_WEIGHT) : 0;
    return priorityB - priorityA;
}
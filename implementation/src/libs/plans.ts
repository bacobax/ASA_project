import { Intention } from "../types/types";


export enum atomicActions {
    moveRight = "moveRight",
    moveLeft = "moveLeft",
    moveUp = "moveUp",
    moveDown = "moveDown",
    pickup = "pickup",
    drop = "drop",
}

const moveDirection = (intention: Intention):atomicActions =>{

    if(intention.x !== undefined && intention.x > 0){
        return atomicActions.moveRight;
    }
    if(intention.x !== undefined && intention.x < 0){
        return atomicActions.moveLeft;
    }
    if(intention.y !== undefined && intention.y > 0){
        return atomicActions.moveUp;
    }
    if(intention.y !== undefined && intention.y < 0){
        return atomicActions.moveDown;
    }
    return atomicActions.moveRight;
}


export class PlanLibrary {
    static getPlan(intention: Intention): atomicActions[] {
        switch (intention.type) {
            case "pickup":
                return [moveDirection(intention), atomicActions.pickup];
            case "deliver":
                return [moveDirection(intention), atomicActions.drop];
            default:
                return [];
        }
    }
}
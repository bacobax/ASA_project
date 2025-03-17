import { Intention, atomicActions, Position, MapConfig, MapTile } from "../types/types";
import { BeliefBase } from "./beliefs";
import { getOptimalPath } from "./utils";



// const moveDirection = (intention: Intention):atomicActions =>{

//     if(intention.position.x !== undefined && intention.position.x > 0){
//         return atomicActions.moveRight;
//     }
//     if(intention.position.x !== undefined && intention.position.x < 0){
//         return atomicActions.moveLeft;
//     }
//     if(intention.position.y !== undefined && intention.position.y > 0){
//         return atomicActions.moveUp;
//     }
//     if(intention.position.y !== undefined && intention.position.y < 0){
//         return atomicActions.moveDown;
//     }
//     return atomicActions.moveRight;
// }

export class PlanLibrary {
    static getPlan(intention: Intention, beliefs:BeliefBase): atomicActions[] {
        const curPos:Position = beliefs.getBelief("position") as Position;
        var actions:atomicActions[] = []
        switch (intention.type) {
            case "pickup":
                if(intention.position && intention.position.x!= curPos.x && intention.position.y!=curPos.y){
                    const map:MapConfig = beliefs.getBelief("map") as MapConfig;
                    actions = getOptimalPath(curPos, intention.position, map.width, map.height, beliefs.getBelief("paths") as Map<number, Map<number, MapTile[]>>)
                }
                actions.push(atomicActions.pickup)
                return actions;
            case "deliver":
                if(intention.position && intention.position.x!= curPos.x && intention.position.y!=curPos.y){
                    const map:MapConfig = beliefs.getBelief("map") as MapConfig;
                    actions = getOptimalPath(curPos, intention.position, map.width, map.height, beliefs.getBelief("paths") as Map<number, Map<number, MapTile[]>>)
                }
                actions.push(atomicActions.drop)
                
                return actions;
            case "move":
                if(intention.position && intention.position.x!= curPos.x && intention.position.y!=curPos.y){
                    const map:MapConfig = beliefs.getBelief("map") as MapConfig;
                    actions = getOptimalPath(curPos, intention.position, map.width, map.height, beliefs.getBelief("paths") as Map<number, Map<number, MapTile[]>>)
                }
                return actions;
            default:
                return [];
        }
    }
}
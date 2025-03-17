import { Intention, atomicActions, Position, MapConfig, MapTile } from "../types/types";
import { BeliefBase } from "./beliefs";
import { getOptimalPath, getDeliverySpot } from "./utils";


export class PlanLibrary {
    static getPlan(intention: Intention, beliefs:BeliefBase): atomicActions[] {
        const curPos:Position = beliefs.getBelief("position") as Position;
        const map:MapConfig = beliefs.getBelief("map") as MapConfig;
        var actions:atomicActions[] = []
        switch (intention.type) {
            case "pickup":
                if(intention.position !== undefined && (intention.position.x!= curPos.x || intention.position.y!=curPos.y)){
                    
                    actions = getOptimalPath(curPos, intention.position, map.width, map.height, beliefs.getBelief("paths") as Map<number, Map<number, MapTile[]>>)
                }
                actions.push(atomicActions.pickup)
                return actions;
            case "deliver":
                const deliveryPos:Position = getDeliverySpot(curPos, 0, beliefs);
                actions = getOptimalPath(curPos, deliveryPos, map.width, map.height, beliefs.getBelief("paths") as Map<number, Map<number, MapTile[]>>)
                actions.push(atomicActions.drop)
                
                return actions;
            case "move":
                const deliveryPosDis:Position = getDeliverySpot(curPos, 3, beliefs);
                actions = getOptimalPath(curPos, deliveryPosDis, map.width, map.height, beliefs.getBelief("paths") as Map<number, Map<number, MapTile[]>>)
                
                return actions;
            default:
                return [];
        }
    }
}
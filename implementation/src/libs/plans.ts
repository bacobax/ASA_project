import { Intention, atomicActions, Position, MapConfig, MapTile, Agent } from "../types/types";
import { BeliefBase } from "./beliefs";
import { getOptimalPath, getDeliverySpot } from "./utils";


export class PlanLibrary {
    static getPlan(intention: Intention, beliefs: BeliefBase): atomicActions[] {
        const curPos: Position = beliefs.getBelief("position") as Position;
        const map: MapConfig = beliefs.getBelief("map") as MapConfig;
        const agents = beliefs.getBelief<Agent[]>("agents") || [];
        
        let actions: atomicActions[] = [];
        
        switch (intention.type) {
            case "pickup":
                if (intention.position && (intention.position.x !== curPos.x || intention.position.y !== curPos.y)) {
                    try{
                        actions = getOptimalPath(
                            curPos, 
                            intention.position, 
                            map, 
                            beliefs 
                        );
                        actions.push(atomicActions.pickup);
                    }catch (error) {
                        console.error("Error in pathfinding:", error);
                        actions = [];
                    }
                }
                
                break;
            case "deliver":
                const deliveryPos = getDeliverySpot(curPos, 0, beliefs);

                try{
                    actions = getOptimalPath(
                        curPos, 
                        deliveryPos, 
                        map, 
                        beliefs 
                    );
                    actions.push(atomicActions.drop);
                }catch (error) {
                    console.error("Error in pathfinding:", error);
                    actions = [];
                }
                break;
            case "move":
                if (intention.position && (intention.position.x !== curPos.x || intention.position.y !== curPos.y)) {
                    try{
                        actions = getOptimalPath(
                            curPos, 
                            intention.position, 
                            map, 
                            beliefs 
                        );
                    }catch (error) {
                        console.error("Error in pathfinding:", error);
                        actions = [];
                    }
                }
                break;
        }
        return actions;
    }
}
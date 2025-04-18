import { Intention, atomicActions, Position, MapConfig, MapTile, Agent, desireType } from "../types/types";
import { BeliefBase } from "./beliefs";
import { getOptimalPath, getDeliverySpot } from "./utils";


export class PlanLibrary {
    static getPlan(intention: Intention, beliefs: BeliefBase): atomicActions[] {
        const curPos: Position = beliefs.getBelief("position") as Position;
        const map: MapConfig = beliefs.getBelief("map") as MapConfig;
        const agents = beliefs.getBelief<Agent[]>("agents") || [];
        
        let actions: atomicActions[] | null = [];
        
        switch (intention.type) {
            case desireType.PICKUP:
                if (intention.position && (intention.position.x !== curPos.x || intention.position.y !== curPos.y)) {
                        actions = getOptimalPath(
                            curPos, 
                            intention.position, 
                            map, 
                            beliefs 
                        );
                        if(actions === null){
                            console.error("Error in pathfinding");
                            actions = [];
                        }else{
                            actions.push(atomicActions.pickup);
                        }
                }
                break;
            case desireType.DELIVER:
                const deliveryPos = getDeliverySpot(curPos, 0, beliefs);

                actions = getOptimalPath(
                    curPos, 
                    deliveryPos, 
                    map, 
                    beliefs 
                );
                if (actions === null) {
                    console.error("Error in pathfinding");
                    actions = [];
                } else {
                    actions.push(atomicActions.drop);
                }
                break;
            case desireType.MOVE:
                if (intention.position && (intention.position.x !== curPos.x || intention.position.y !== curPos.y)) {
                    actions = getOptimalPath(
                        curPos, 
                        intention.position, 
                        map, 
                        beliefs 
                    );
                    if (actions === null) {
                        console.error("Error in pathfinding");
                        actions = [];
                    }
                }
                break;
        }
        return actions;
    }
}
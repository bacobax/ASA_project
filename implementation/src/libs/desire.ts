import { BeliefBase } from "./beliefs";
import { atomicActions, desireType, Intention, MapConfig, Parcel, Position } from "../types/types";
import { generateDesiresPickupDeliver, getCenterDirectionTilePosition,  getNearestDeliverySpot, selectBestExplorationTile, sendHelpAvailabilityMessage } from "./utils/desireUtils";
import {  EXPLORATION_STEP_TOWARDS_CENTER } from "../config";
import { getConfig, Strategies } from "./utils/common";
import { getDeliverySpot, getMinDistance } from "./utils/mapUtils";
import { rewardNormalizations } from "./utils/planUtils";



/**
 * DesireGenerator class handles the generation of desires (intentions) based on the agent's beliefs
 * and current state. It implements a reward-based decision-making system for parcel delivery.
 */
export class DesireGenerator {
    /**
     * Generates a list of desires based on current beliefs and state
     * @param beliefs Current belief base of the agent
     * @returns Array of intentions representing desires
     */
    /**
     * Generates all possible intentions based on the agent's current belief base.
     */
    generateDesires(beliefs: BeliefBase): Intention[] {
        console.log("-----Generating Desire Options-----");
        const desires: Intention[] = [];

        const curPos: Position = beliefs.getBelief("position") as Position;

        const isCollaborating = beliefs.getBelief<boolean>("isCollaborating");
        const role = beliefs.getBelief<string>("role");

        desires.concat(generateDesiresPickupDeliver(beliefs));
        

        // Always have a fallback desire to explore

        let tileToExplore = selectBestExplorationTile(beliefs, curPos);
        if (!tileToExplore) {
            tileToExplore = getDeliverySpot(curPos, 3, beliefs).position;
        }
        
        desires.push({
            type: desireType.MOVE,
            position: tileToExplore
        });
        return desires;
    }

  
}

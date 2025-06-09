import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { BeliefBase } from "./beliefs";
import {
    resetBeliefsCollaboration,
    sendAvailabilityMessage,
} from "./utils/commumications";
import { IntentionManager } from "./intentions";
import { desireType, Position } from "../types/types";
import { calculateMidpoint } from "./utils/mapUtils";
interface handleOnMessageProps {
    beliefs: BeliefBase;
    setLastCollaborationTime: (time: number) => void;
    api: DeliverooApi;
    intentions: IntentionManager;
    stopCurrentPlan: () => void;
    needHelp: () => boolean;
}

export const handleOnMessage =
    ({
        beliefs,
        api,
        intentions,
        setLastCollaborationTime,
        stopCurrentPlan,
        needHelp,
    }: handleOnMessageProps) =>
    async (id: string, name: string, msg: string, _reply: any) => {
        if (!beliefs.getBelief<string[]>("teammatesIds")?.includes(id)) {
            return;
        }
        const collaborating = beliefs.getBelief<boolean>("isCollaborating");

        const message = JSON.parse(msg) as { type: string; data: any };

        if (message.type === "available_to_help" && !collaborating) {
            // A receives help availability message from B
            if (needHelp()) {
                beliefs.updateBelief("isCollaborating", true);
                beliefs.updateBelief("role", "explorer");

                const midpoint = calculateMidpoint(beliefs);
                beliefs.updateBelief("midpoint", midpoint);
                console.log("Midpoint calculated:", midpoint);

                //TODO: EVALUATE IF WE SHOULD FINISH DELIVERING OR NOT
                await stopCurrentPlan();

                console.log("i am **EXPLORER**");
                setLastCollaborationTime(Date.now());

                api.emitSay(
                    id,
                    JSON.stringify({
                        type: "help_here",
                        data: {
                            midpoint: midpoint,
                        },
                    })
                );
            } else {
                // If we don't need help, send availability message
                sendAvailabilityMessage(beliefs, api, false);
            }
        } else if (message.type === "help_here" && !collaborating) {
            // B receives help acceptance message from A with midpoint
            if (
                intentions.getCurrentIntention()?.type === desireType.MOVE ||
                intentions.getCurrentIntention() === null
            ) {
                await stopCurrentPlan();
                console.log("i am **COURIER**");
                beliefs.updateBelief("isCollaborating", true);
                beliefs.updateBelief("midpoint", message.data.midpoint);
                beliefs.updateBelief("role", "courier");
            } else {
                sendAvailabilityMessage(beliefs, api, false);
            }
        } else if (message.type === "not_available_to_help") {
            // Teammate is no longer available to help
            resetBeliefsCollaboration(beliefs);
        } else if (message.type === "position_update") {
            // Teammate sends their position update
            const newTeammatePosition = message.data.position as Position;
            const teammatesPositions =
                beliefs.getBelief<Record<string, Position>>(
                    "teammatesPositions"
                ) || {};
            teammatesPositions[id] = newTeammatePosition;
            beliefs.updateBelief("teammatesPositions", teammatesPositions);
        } else if (message.type === "intention_update") {
            // Teammate sends their intention update
            const teammateIntention = message.data.intentionType as desireType;
            beliefs.updateBelief("teammateIntentionType", teammateIntention);
        } else if (message.type === "book_parcel") {
            // Teammate books a parcel
            const parcelIds = message.data.parcelsIds as string[];
            //save those parcels in beliefs as parcelBookedByTeammates
            beliefs.updateBelief("parcelsBookedByTeammates", parcelIds);
        }
    };

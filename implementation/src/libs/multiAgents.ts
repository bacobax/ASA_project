import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { BeliefBase } from "./beliefs";
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

/**
 * Handles an incoming message from another agent and updates beliefs and intentions accordingly.
 */
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
        if (!beliefs.getBelief<string[]>("teammatesIds")?.includes(id)) return;

        const collaborating = beliefs.getBelief<boolean>("isCollaborating");
        const message = JSON.parse(msg) as { type: string; data: any };

        switch (message.type) {
            case "available_to_help":
                await handleAvailableToHelp(
                    message,
                    id,
                    beliefs,
                    api,
                    collaborating,
                    needHelp,
                    stopCurrentPlan,
                    setLastCollaborationTime
                );
                break;
            case "help_here":
                await handleHelpHere(
                    message,
                    beliefs,
                    intentions,
                    collaborating,
                    stopCurrentPlan
                );
                break;
            case "not_available_to_help":
                handleNotAvailableToHelp(beliefs);
                break;
            case "position_update":
                handlePositionUpdate(message, id, beliefs);
                break;
            case "intention_update":
                handleIntentionUpdate(message, beliefs);
                break;
            case "book_parcel":
                handleBookParcel(message, beliefs);
                break;
        }
    };

/**
 * Handles the "available_to_help" message type.
 * If the agent needs help and is not currently collaborating, updates beliefs and notifies the sender.
 * Otherwise, sends availability message indicating no help needed.
 *
 * @param message - The parsed message object
 * @param id - The sender's agent ID
 * @param beliefs - The agent's belief base
 * @param api - The Deliveroo API client
 * @param collaborating - Whether the agent is currently collaborating
 * @param needHelp - Function to check if the agent needs help
 * @param stopCurrentPlan - Function to stop the current plan
 * @param setLastCollaborationTime - Function to update the last collaboration timestamp
 */
function handleAvailableToHelp(
    message: { type: string; data: any },
    id: string,
    beliefs: BeliefBase,
    api: DeliverooApi,
    collaborating: boolean | undefined,
    needHelp: () => boolean,
    stopCurrentPlan: () => void,
    setLastCollaborationTime: (time: number) => void
) {
    if (collaborating) return;

    if (needHelp()) {
        beliefs.updateBelief("isCollaborating", true);
        beliefs.updateBelief("role", "explorer");

        const midpoint = calculateMidpoint(beliefs);
        beliefs.updateBelief("midpoint", midpoint);
        console.log("Midpoint calculated:", midpoint);

        //TODO: EVALUATE IF WE SHOULD FINISH DELIVERING OR NOT
        stopCurrentPlan();

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
}

/**
 * Handles the "help_here" message type.
 * If the agent is not collaborating and its current intention is MOVE or null,
 * stops current plan and updates beliefs to become "courier".
 * Otherwise, sends availability message indicating no help needed.
 *
 * @param message - The parsed message object
 * @param beliefs - The agent's belief base
 * @param intentions - The agent's intention manager
 * @param collaborating - Whether the agent is currently collaborating
 * @param stopCurrentPlan - Function to stop the current plan
 */
async function handleHelpHere(
    message: { type: string; data: any },
    beliefs: BeliefBase,
    intentions: IntentionManager,
    collaborating: boolean | undefined,
    stopCurrentPlan: () => void
) {
    if (collaborating) return;

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
        sendAvailabilityMessage(beliefs, undefined as any, false);
    }
}

/**
 * Handles the "not_available_to_help" message type.
 * Resets collaboration-related beliefs.
 *
 * @param beliefs - The agent's belief base
 */
function handleNotAvailableToHelp(beliefs: BeliefBase) {
    resetBeliefsCollaboration(beliefs);
}

/**
 * Handles the "position_update" message type.
 * Updates the teammate's position in the beliefs.
 *
 * @param message - The parsed message object
 * @param id - The sender's agent ID
 * @param beliefs - The agent's belief base
 */
function handlePositionUpdate(
    message: { type: string; data: any },
    id: string,
    beliefs: BeliefBase
) {
    const newTeammatePosition = message.data.position as Position;
    const teammatesPositions =
        beliefs.getBelief<Record<string, Position>>("teammatesPositions") || {};
    teammatesPositions[id] = newTeammatePosition;
    beliefs.updateBelief("teammatesPositions", teammatesPositions);
}

/**
 * Handles the "intention_update" message type.
 * Updates the teammate's intention type in the beliefs.
 *
 * @param message - The parsed message object
 * @param beliefs - The agent's belief base
 */
function handleIntentionUpdate(message: { type: string; data: any }, beliefs: BeliefBase) {
    const teammateIntention = message.data.intentionType as desireType;
    beliefs.updateBelief("teammateIntentionType", teammateIntention);
}

/**
 * Handles the "book_parcel" message type.
 * Updates the list of parcels booked by teammates in the beliefs.
 *
 * @param message - The parsed message object
 * @param beliefs - The agent's belief base
 */
function handleBookParcel(message: { type: string; data: any }, beliefs: BeliefBase) {
    const parcelIds = message.data.parcelsIds as string[];
    beliefs.updateBelief("parcelsBookedByTeammates", parcelIds);
}



/**
 * Sends a message to teammates indicating the availability status to help.
 * If available is true, notifies teammates of availability along with current position.
 * If available is false, notifies teammates of unavailability and resets collaboration beliefs.
 * 
 * @param {BeliefBase} beliefs - The belief base containing agent's beliefs.
 * @param {DeliverooApi} api - The Deliveroo API instance used to send messages.
 * @param {boolean} available - Indicates whether the agent is available to help.
 */
export function sendAvailabilityMessage(
    beliefs: BeliefBase,
    api: DeliverooApi,
    available: boolean
): void {
    // Send message to teammate to inform about availability to help
    const teammatesIds = beliefs.getBelief<string[]>("teammatesIds");
    const myId = beliefs.getBelief<string>("id");
    const myPosition = beliefs.getBelief<Position>("position");

    if (!teammatesIds || !myId || !myPosition) {
        return;
    }
    for (const teammateId of teammatesIds) {
        if (teammateId !== myId) {
            api.emitSay(
                teammateId,
                JSON.stringify({
                    type: available
                        ? "available_to_help"
                        : "not_available_to_help",
                    data: {
                        position: myPosition,
                    },
                })
            );
        }
    }
    if (available) {
        console.log(
            `Sent availability message to teammates: ${teammatesIds.join(", ")}`
        );
        beliefs.updateBelief("attemptingToHelpTeammate", true);
    } else {
        console.log(`Sent unavailability message to teammates`);
        resetBeliefsCollaboration(beliefs);
    }
}

/**
 * Resets collaboration-related beliefs in the belief base.
 * Sets attemptingToHelpTeammate and isCollaborating to false,
 * and clears midpoint, role, and teammateIntentionType beliefs.
 * 
 * @param {BeliefBase} beliefs - The belief base to update.
 */
export function resetBeliefsCollaboration(beliefs: BeliefBase): void {
    beliefs.updateBelief("attemptingToHelpTeammate", false);
    beliefs.updateBelief("isCollaborating", false);
    beliefs.updateBelief("midpoint", null);
    beliefs.updateBelief("role", null);
    beliefs.updateBelief("teammateIntentionType", null);
}

/**
 * Sends an intention update message to all teammates except self.
 * The message contains the updated intention type.
 * 
 * @param {DeliverooApi} api - The Deliveroo API instance used to send messages.
 * @param {BeliefBase} beliefs - The belief base containing agent's beliefs.
 * @param {desireType} intentionType - The updated intention type to communicate.
 */
export function sendIntentionUpdateMessage(
    api: DeliverooApi,
    beliefs: BeliefBase,
    intentionType: desireType
): void {
    const teammatesIds = beliefs.getBelief<string[]>("teammatesIds");
    const myId = beliefs.getBelief<string>("id");
    const myPosition = beliefs.getBelief<Position>("position");

    if (!teammatesIds || !myId || !myPosition) {
        return;
    }
    for (const teammateId of teammatesIds) {
        if (teammateId !== myId) {
            api.emitSay(
                teammateId,
                JSON.stringify({
                    type: "intention_update",
                    data: {
                        intentionType,
                    },
                })
            );
        }
    }
    // console.log(`Sent intention update message: ${intentionType}`);
}

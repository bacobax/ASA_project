import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { BeliefBase } from "../beliefs";
import { Position } from "../../types/types";

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
        console.log(
            `Sent unavailability message to teammates`
        );
        resetBeliefsCollaboration(beliefs);
    }
}

export function resetBeliefsCollaboration(beliefs: BeliefBase): void {
    beliefs.updateBelief("attemptingToHelpTeammate", false);
    beliefs.updateBelief("isCollaborating", false);
    beliefs.updateBelief("midpoint", null);
    beliefs.updateBelief("role", null);
}

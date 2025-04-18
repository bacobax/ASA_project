import { BeliefBase } from "./beliefs";
import { Intention, Parcel, Position } from "../types/types";
import { getDeliverySpot, getNearestParcel, getNearestDeliverySpot, getCenterDirectionTilePosition } from "./utils";
import { DECAY_INTERVAL, EXPLORATION_STEP_TOWARDS_CENTER } from "../config";

/**
 * Interface for reward calculation parameters
 */
interface RewardCalculationParams {
    optionalParcel: Parcel;
    carryingParcels: Parcel[];
    timeForSecondaryPath: number;
    beliefs: BeliefBase;
}

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
    generateDesires(beliefs: BeliefBase): Intention[] {
        console.log("-----Generating Desires-----");
        const desires: Intention[] = [];
        const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
        const carryingParcels = this.getCarryingParcels(beliefs, parcels);

        if (this.isCarryingParcels(carryingParcels)) {
            this.handleCarryingParcels(parcels ?? [], beliefs, carryingParcels!, desires);
        }

        this.handleAvailableParcels(parcels, desires);

        if (this.shouldExplore(desires)) {
            this.addExplorationDesire(beliefs, desires);
        }

        return desires;
    }

    /**
     * Retrieves parcels currently being carried by the agent
     */
    private getCarryingParcels(beliefs: BeliefBase, parcels: Parcel[] | undefined): Parcel[] | undefined {
        return parcels?.filter(parcel => parcel.carriedBy === beliefs.getBelief("id"));
    }

    /**
     * Checks if the agent is carrying any parcels
     */
    private isCarryingParcels(carryingParcels: Parcel[] | undefined): boolean {
        return Boolean(carryingParcels && carryingParcels.length > 0);
    }

    /**
     * Handles the logic for when the agent is carrying parcels
     */
    private handleCarryingParcels(parcels: Parcel[] | undefined, beliefs: BeliefBase, carryingParcels: Parcel[], desires: Intention[]): void {
        this.considerAdditionalPickup(parcels, beliefs, carryingParcels, desires);
        console.log("Desire pushed - deliver");
        desires.push({ type: "deliver" });
    }

    /**
     * Processes available parcels and adds pickup desires
     */
    private handleAvailableParcels(parcels: Parcel[] | undefined, desires: Intention[]): void {
        if (!parcels) return;

        for (const parcel of parcels) {
            console.log("Desire pushed - pickup:", parcel);
            desires.push({
                type: "pickup",
                parcelId: parcel.id,
                position: { x: parcel.x, y: parcel.y }
            });
        }
    }

    /**
     * Determines if the agent should explore
     */
    private shouldExplore(desires: Intention[]): boolean {
        return desires.length === 0;
    }

    /**
     * Adds exploration desire when no other desires exist
     */
    private addExplorationDesire(beliefs: BeliefBase, desires: Intention[]): void {
        console.log("Desire pushed - move");
        // desires.push({
        //     type: "move",
        //     position: getDeliverySpot(beliefs.getBelief("position") as Position, 3, beliefs)
        // });
        desires.push({
            type: "move",
            position: getCenterDirectionTilePosition(
                EXPLORATION_STEP_TOWARDS_CENTER, 
                beliefs.getBelief("position") as Position, 
                beliefs
            )
        });
    }

    /**
     * Evaluates whether to pick up additional parcels while carrying others
     */
    private considerAdditionalPickup(parcels: Parcel[] | undefined, beliefs: BeliefBase, carryingParcels: Parcel[], desires: Intention[]): void {
        const uncarriedParcels = parcels?.filter(parcel => parcel.carriedBy === null);
        if (!uncarriedParcels || uncarriedParcels.length === 0) return;

        const nearestParcelResult = getNearestParcel({ beliefs });
        if (!nearestParcelResult) {
            console.log("All paths to parcels are blocked");
            return;
        }

        const { parcel, time: fromMeToParcelTime } = nearestParcelResult;
        const deliverySpotResult = getNearestDeliverySpot({
            startPosition: { x: parcel.x, y: parcel.y },
            beliefs
        });

        if (!deliverySpotResult) {
            console.log("All paths to delivery are blocked");
            return;
        }

        const { time: fromParcelToDeliveryTime } = deliverySpotResult;
        const timeForSecondaryPath = fromMeToParcelTime + fromParcelToDeliveryTime;
        const minExpirationTimeInMS = this.calculateMinExpirationTime(carryingParcels);

        if (this.canPickupAdditionalParcel(timeForSecondaryPath, minExpirationTimeInMS)) {
            const { deliverCarrying, pickupAnother } = this.calculateRewards({
                optionalParcel: parcel,
                carryingParcels,
                timeForSecondaryPath,
                beliefs
            });

            if (pickupAnother > deliverCarrying) {
                this.addPickupDesire(parcel, desires);
            }
        }
    }

    /**
     * Calculates rewards for different delivery strategies
     */
    private calculateRewards({ optionalParcel, carryingParcels, timeForSecondaryPath, beliefs }: RewardCalculationParams) {
        const { reward } = optionalParcel;
        const totalRewardAtDeliverySecondaryPath = [
            ...carryingParcels.map(p => p.reward * Math.exp(-timeForSecondaryPath/DECAY_INTERVAL)),
            reward * Math.exp(-timeForSecondaryPath/DECAY_INTERVAL)
        ].reduce((acc, cur) => acc + cur, 0);

        const deliverySpotResult = getNearestDeliverySpot({
            startPosition: beliefs.getBelief("position") as Position,
            beliefs
        });

        if (!deliverySpotResult) {
            return { pickupAnother: totalRewardAtDeliverySecondaryPath, deliverCarrying: -Infinity };
        }

        const { time } = deliverySpotResult;
        const totalRewardAtDeliveryPrimaryPath = carryingParcels
            .map(p => p.reward * Math.exp(-time/DECAY_INTERVAL))
            .reduce((acc, cur) => acc + cur, 0);

        return {
            pickupAnother: totalRewardAtDeliverySecondaryPath / timeForSecondaryPath,
            deliverCarrying: totalRewardAtDeliveryPrimaryPath / time
        };
    }

    /**
     * Calculates minimum expiration time for carried parcels
     */
    private calculateMinExpirationTime(carryingParcels: Parcel[]): number {
        return carryingParcels.map(p => p.reward * DECAY_INTERVAL).sort((a, b) => a - b)[0];
    }

    /**
     * Determines if additional parcel pickup is feasible
     */
    private canPickupAdditionalParcel(timeForSecondaryPath: number, minExpirationTimeInMS: number): boolean {
        return timeForSecondaryPath < minExpirationTimeInMS;
    }

    /**
     * Adds pickup desire for a specific parcel
     */
    private addPickupDesire(parcel: Parcel, desires: Intention[]): void {
        desires.push({
            type: "pickup",
            parcelId: parcel.id,
            position: { x: parcel.x, y: parcel.y }
        });
    }
}

import { onlineSolver, PddlProblem, PddlPlanStep } from "@unitn-asa/pddl-client";
import { pddlDomain, Strategies } from "../utils/common";
import { atomicActions, desireType, Intention, Position, Parcel, MapConfig } from "../../types/types";
import { BeliefBase } from "../beliefs";
import { bestParcel } from "../plans";
import { getDeliverySpot } from "../utils/mapUtils";

/**
 * Generates a tile name string based on x and y coordinates.
 * @param x - The x-coordinate of the tile.
 * @param y - The y-coordinate of the tile.
 * @returns The string name of the tile in the format `T{x}_{y}`.
 */
export const tileName = (x: number, y: number) => `T${x}_${y}`;

/**
 * Creates a PDDL problem generator function based on the current beliefs.
 * The returned function takes an intention and produces a PddlProblem instance.
 * 
 * @param beliefs - The belief base containing the agent's knowledge.
 * @returns A function that takes an intention and returns a PddlProblem.
 */
const pddlProblem = (beliefs: BeliefBase) : (intention: Intention) => PddlProblem => {
    const id = beliefs.getBelief<string>("id")!;
    const pos = beliefs.getBelief<Position>("position")!;
    const map = beliefs.getBelief<MapConfig>("map")!;
    const strategy = beliefs.getBelief<Strategies>("strategy")!;

    const visibleParcels = beliefs.getBelief<Parcel[]>("visibleParcels") ?? [];
    const carrying = visibleParcels.filter((p: Parcel) => p.carriedBy === id);
    const allParcels = [...visibleParcels];

    const me = `agent${id}`;
    const agentObj = `${me}`;

    const parcelPreds = allParcels.map(p => `(parcel p${p.id})`);
    const parcelAtPreds = allParcels.filter(p => !p.carriedBy).map(p => `(at p${p.id} ${tileName(p.x, p.y)})`);
    const carriedPreds = carrying.map(p => `(carrying ${agentObj} p${p.id})`);

    const tiles = new Set<string>();
    tiles.add(tileName(pos.x, pos.y));
    allParcels.forEach(p => tiles.add(tileName(p.x, p.y)));
    map.tiles.forEach(t => tiles.add(tileName(t.x, t.y))); // ✅ Ensure all tiles are added to the set

    return (intention: Intention) => {
        const desire = intention.type;
        let goal = "";
    
        if (desire === desireType.PICKUP) {
            const targetParcel = bestParcel(intention, pos, map, beliefs, strategy);
            if (!targetParcel) throw new Error("Target parcel not found for PICKUP intention");
            
            tiles.add(tileName(targetParcel.x, targetParcel.y)); // ✅ Ensure tile exists
            goal = `carrying ${agentObj} p${targetParcel.id}`;
        } else if (desire === desireType.DELIVER) {
            const targetParcel = carrying[0];
            if (!targetParcel) throw new Error("No carried parcel to deliver");
            const {position: deliveryPosition} = getDeliverySpot(pos, 0, beliefs);
            tiles.add(tileName(deliveryPosition!.x, deliveryPosition!.y)); // ✅ Ensure delivery tile exists
            goal = `and (at p${targetParcel.id} ${tileName(deliveryPosition!.x, deliveryPosition!.y)})`;
        } else if (desire === desireType.MOVE) {
            tiles.add(tileName(intention.position!.x, intention.position!.y)); // ✅ Ensure move target tile exists
            goal = `at ${agentObj} ${tileName(intention.position!.x, intention.position!.y)}`;
        } else {
            throw new Error("Desire not implemented");
        }
    
        const tilePreds = [...tiles].map(t => `(tile ${t})`);
        const objects = [agentObj, ...allParcels.map(p => `p${p.id}`), ...tiles].join(" ");

        const adjacencyPreds: string[] = beliefs.getBelief<string[]>("adjacencyPreds")!;

        const init = [
            `(me ${agentObj})`,
            `(agent ${agentObj})`,
            `(at ${agentObj} ${tileName(pos.x, pos.y)})`,
            ...tilePreds,
            ...parcelPreds,
            ...parcelAtPreds,
            ...carriedPreds,
            ...adjacencyPreds,
        ].join(" ");
    
        return new PddlProblem("deliveroo", objects, init, goal);
    };
};

const pddlActionAtomicActionMap = {
    "right": atomicActions.moveRight,
    "left": atomicActions.moveLeft,
    "up": atomicActions.moveUp,
    "down": atomicActions.moveDown,
    "pickup": atomicActions.pickup,
    "putdown": atomicActions.drop,
}

/**
 * Custom online solver that calls the PDDL online solver API.
 * 
 * @param param0 - Object containing PDDL domain and problem strings.
 * @param param0.pddlDomain - The PDDL domain definition as a string.
 * @param param0.pddlProblem - The PDDL problem definition as a string.
 * @returns The plan result from the online solver.
 */
export const customOnlineSolver = async ({pddlDomain, pddlProblem} :  {pddlDomain: string, pddlProblem: string}) => {
    console.time("PDDL API time");
    const result = await onlineSolver(pddlDomain, pddlProblem);
    console.timeEnd("PDDL API time");
    return result;
}

/**
 * Solves the planning problem for a given intention and beliefs.
 * Returns the sequence of atomic actions and the original intention.
 * 
 * @param intention - The intention to plan for.
 * @param beliefs - The current belief base.
 * @returns A promise resolving to an object containing the path of atomic actions and the intention, or undefined if no plan found.
 */
export const solver = async (intention: Intention, beliefs: BeliefBase): Promise<{path: atomicActions[], intention: Intention} | undefined>=> {
    const domain: string = await pddlDomain;

    
    const pddlProblemGenerator = pddlProblem(beliefs);

    const problem = pddlProblemGenerator(intention);

    console.log(`Calling PDDL solver for ${intention.type}`);

    const plan = await customOnlineSolver({
        pddlDomain: domain,
        pddlProblem: problem.toPddlString(),
    })

    if (!plan) return undefined;

    console.log({plan})

    const atomicActions = plan.map((step: PddlPlanStep) => {
        const action = step.action;
        return pddlActionAtomicActionMap[action.toLowerCase() as keyof typeof pddlActionAtomicActionMap];
    })
    
    return {path: atomicActions, intention};

};

export { pddlProblem };
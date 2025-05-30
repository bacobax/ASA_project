import { onlineSolver, PddlExecutor, PddlProblem, PddlPlan, PddlPlanStep } from "@unitn-asa/pddl-client";
import fs from "fs";
import { pddlDomain, Strategies } from "../utils/common";
import { atomicActions, desireType, Intention, Position, Parcel, MapConfig } from "../../types/types";
import { BeliefBase } from "../beliefs";
import { bestParcel } from "../plans";

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
    const tileName = (x: number, y: number) => `t${x}_${y}`;

    const agentAt = `(at ${agentObj} ${tileName(pos.x, pos.y)})`;
    const objects = [agentObj, ...allParcels.map(p => `p${p.id}`), tileName(pos.x, pos.y)].join(" ");

    const parcelPreds = allParcels.map(p => `(parcel p${p.id})`);
    const parcelAtPreds = allParcels.filter(p => !p.carriedBy).map(p => `(at p${p.id} ${tileName(p.x, p.y)})`);
    const carriedPreds = carrying.map(p => `(carrying ${agentObj} p${p.id})`);

    const tiles = new Set<string>();
    tiles.add(tileName(pos.x, pos.y));
    allParcels.forEach(p => tiles.add(tileName(p.x, p.y)));
    

    return (intention: Intention) => {
        if (intention.position) {
            tiles.add(tileName(intention.position.x, intention.position.y));
        }
    
        const tilePreds = [...tiles].map(t => `(tile ${t})`);
    
        const init = [
            `(me ${agentObj})`,
            `(agent ${agentObj})`,
            agentAt,
            ...tilePreds,
            ...parcelPreds,
            ...parcelAtPreds,
            ...carriedPreds
        ].join(" ");
    
        const desire = intention.type;
        console.log({allParcels})
        console.log(intention)
        let goal = "";
        if (desire === desireType.PICKUP) {

            const targetParcel = bestParcel(intention, pos, map, beliefs, strategy);

            // const targetParcel = allParcels.find(p => p.x === intention.position?.x && p.y === intention.position?.y);
            if (!targetParcel) throw new Error("Target parcel not found for PICKUP intention");
            goal = `(carrying ${agentObj} p${targetParcel.id})`;
        } else if (desire === desireType.DELIVER) {
            const targetParcel = carrying[0];
            if (!targetParcel) throw new Error("No carried parcel to deliver");
            goal = `(and (at p${targetParcel.id} ${tileName(intention.position!.x, intention.position!.y)}))`;
        } else if (desire === desireType.MOVE) {
            goal = `(at ${agentObj} ${tileName(intention.position!.x, intention.position!.y)})`;
        } else {
            throw new Error("Desire not implemented");
        }
        return new PddlProblem("deliveroo", objects, init, goal);
    }
};

const pddlActionAtomicActionMap = {
    "right": atomicActions.moveRight,
    "left": atomicActions.moveLeft,
    "up": atomicActions.moveUp,
    "down": atomicActions.moveDown,
    "pickup": atomicActions.pickup,
    "putdown": atomicActions.drop,
}

export const customOnlineSolver = async ({pddlDomain, pddlProblem} :  {pddlDomain: string, pddlProblem: string}) => {
    return onlineSolver(pddlDomain, pddlProblem);
}

export const solver = async (intention: Intention, beliefs: BeliefBase): Promise<{path: atomicActions[], intention: Intention}> => {
    const domain: string = await pddlDomain;

    
    const pddlProblemGenerator = pddlProblem(beliefs);

    const problem = pddlProblemGenerator(intention);

    const plan = await customOnlineSolver({
        pddlDomain: domain,
        pddlProblem: problem.toPddlString(),
    })

    const atomicActions = plan.map((step: PddlPlanStep) => {
        const action = step.action;
        return pddlActionAtomicActionMap[action as keyof typeof pddlActionAtomicActionMap];
    })
    
    return {path: atomicActions, intention};

};

export { pddlProblem };
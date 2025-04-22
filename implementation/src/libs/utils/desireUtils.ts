import { Position, atomicActions, Parcel, Agent } from "../../types/types";
import { BeliefBase } from "../beliefs";
import { MapConfig } from "../../types/types";
import { aStarPath, getOptimalPath } from "./pathfinding";
import { getDeliverySpot } from "./mapUtils";
import { getConfig } from "./common";

export const getNearestParcel = ({ beliefs }: { beliefs: BeliefBase }): { parcel: Parcel, path: atomicActions[], time: number } | null => {
    const parcels = beliefs.getBelief<Parcel[]>("visibleParcels");
    const curPos = beliefs.getBelief<Position>("position");
    const map = beliefs.getBelief<MapConfig>("map");
    const agentId = beliefs.getBelief<string>("id");

    if (!parcels || !curPos || !map || !agentId) throw new Error("Missing beliefs");

    const [firstParcel, ...rest] = parcels.filter(p => !p.carriedBy);
    if (!firstParcel) return null;

    const pathToFirst = getOptimalPath(curPos, { x: firstParcel.x, y: firstParcel.y }, map, beliefs);
    let minLength;
    let minParcel;
    let minPath;

    if (pathToFirst != null) {
        minLength = pathToFirst.length;
        minParcel = firstParcel;
        minPath = pathToFirst;
    } else {
        minLength = Infinity;
        minParcel = null;
        minPath = null;
    }

    for (const parcel of rest) {
        const path = getOptimalPath(curPos, { x: parcel.x, y: parcel.y }, map, beliefs);
        if (path == null) continue;
        const length = path.length;
        if (length < minLength) {
            minLength = length;
            minParcel = parcel;
            minPath = path;
        }
    }

    if (minParcel == null || minPath == null) return null;
    return { parcel: minParcel, path: minPath, time: timeForPath({ path: minPath }).time };
}

export const getNearestDeliverySpot = ({ startPosition, beliefs }: { startPosition: Position, beliefs: BeliefBase }) => {
    const deliveryPosition = getDeliverySpot(startPosition, 1, beliefs);
    const path = getOptimalPath(startPosition, deliveryPosition, beliefs.getBelief("map") as MapConfig, beliefs);
    if (path == null) return null;
    const { time } = timeForPath({ path });
    return { deliveryPosition, path, time };
}

export const getCenterDirectionTilePosition = (
    nStep: number,
    position: Position,
    beliefs: BeliefBase
): Position => {
    const map = beliefs.getBelief<MapConfig>("map");
    if (!map) throw new Error("Missing map");

    const center: Position = {
        x: Math.floor(map.width / 2),
        y: Math.floor(map.height / 2),
    };

    const agents = beliefs.getBelief<Agent[]>("agents") || [];
    const obstacles = agents
        .filter(agent => agent.x !== position.x || agent.y !== position.y)
        .map(agent => ({ x: agent.x, y: agent.y }));

    const path = aStarPath(position, center, map, obstacles);

    if (!path || path.length === 0) {
        throw new Error(`No path found from (${position.x},${position.y}) to map center`);
    }

    const stepIndex = Math.min(nStep, path.length - 1);
    const targetTile = path[stepIndex];
    return { x: targetTile.x, y: targetTile.y };
}

export const timeForPath = ({ path }: { path: atomicActions[] }) => {
    const movementSpeed = getConfig<number>("MOVEMENT_DURATION");
    if (!movementSpeed) throw new Error("MOVEMENT_DURATION not found");
    return { time: path.length * movementSpeed };
}
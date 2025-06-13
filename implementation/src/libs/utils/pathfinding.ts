import { MapTile, MapConfig, Position, atomicActions, Agent } from "../../types/types";
import { BeliefBase } from "../beliefs";
// @ts-ignore
import tqdm from "tqdm";

/**
 * Computes shortest paths and distances between all pairs of tiles in the map using the Floyd-Warshall algorithm.
 * Returns distance and predecessor matrices, along with the actual paths between tiles.
 * @param mapConfig The map configuration containing tiles, width, and height.
 * @returns An object containing:
 *  - dist: A 2D array where dist[i][j] is the shortest distance from tile i to tile j.
 *  - prev: A 2D array where prev[i][j] is the predecessor of j on the shortest path from i to j.
 *  - paths: A nested Map where paths.get(i).get(j) is the sequence of MapTiles representing the shortest path from i to j.
 */
export function floydWarshallWithPaths(mapConfig: MapConfig) {
    const { width, height, tiles } = mapConfig;
    const numTiles = width * height;

    const validTiles = new Map<string, MapTile>();
    tiles.forEach(tile => validTiles.set(`${tile.x},${tile.y}`, tile));

    const dist: number[][]= Array.from({ length: numTiles }, () => Array(numTiles).fill(Infinity));
    const prev: number[][] = Array.from({ length: numTiles }, () => Array(numTiles).fill(-1));
    const paths: Map<number, Map<number, MapTile[]>> = new Map();

    for (let y of tqdm(Array(height).keys(), "Computing distances...")) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            paths.set(i, new Map());

            if (validTiles.has(`${x},${y}`)) {
                dist[i][i] = 0;

                const neighbors = [
                    { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
                ];

                for (const { dx, dy } of neighbors) {
                    const nx = x + dx, ny = y + dy;
                    const j = ny * width + nx;

                    if (validTiles.has(`${nx},${ny}`)) {
                        dist[i][j] = 1;
                        prev[i][j] = i;
                        paths.get(i)?.set(j, [validTiles.get(`${x},${y}`)!, validTiles.get(`${nx},${ny}`)!]);
                    }
                }
            }
        }
    }

    for (let k = 0; k < numTiles; k++) {
        for (let i = 0; i < numTiles; i++) {
            for (let j = 0; j < numTiles; j++) {
                if (dist[i][j] > dist[i][k] + dist[k][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    prev[i][j] = prev[k][j];

                    const newPath = [
                        ...(paths.get(i)?.get(k) || []),
                        ...(paths.get(k)?.get(j)?.slice(1) || [])
                    ];
                    paths.get(i)?.set(j, newPath);
                }
            }
        }
    }

    return { dist, prev, paths };
}

/**
 * Finds the shortest path from startPos to endPos on the map using the A* algorithm.
 * Considers agents' positions as obstacles to avoid collisions.
 * Throws an error if no path is found.
 * @param startPos The starting position.
 * @param endPos The target position.
 * @param mapConfig The map configuration.
 * @param agents Positions of agents to be considered as obstacles.
 * @returns An array of MapTiles representing the path from startPos to endPos.
 * @throws Error if no path can be found.
 */
export function aStarPath(startPos: Position, endPos: Position, mapConfig: MapConfig, agents: Position[]): MapTile[] {
    const { width, height, tiles } = mapConfig;
    const validTiles = new Map<string, MapTile>();
    tiles.forEach(tile => {

        validTiles.set(`${tile.x},${tile.y}`, tile)
    });

    const openSet: MapTile[] = [];
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, MapTile>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    // const startTile = validTiles.get(`${startPos.x},${startPos.y}`);
    // const endTile = validTiles.get(`${endPos.x},${endPos.y}`);
    const startTile = tiles.find(tile => tile.x === startPos.x && tile.y === startPos.y);
    const endTile = tiles.find(tile => tile.x === endPos.x && tile.y === endPos.y);

    if (!startTile || !endTile) throw new Error("Invalid start or end position " + startPos.x + " " + startPos.y + " " + endPos.x + " " + endPos.y);

    const agentsSet = new Set(agents.map(p => `${p.x},${p.y}`));

    openSet.push(startTile);
    gScore.set(`${startPos.x},${startPos.y}`, 0);
    fScore.set(`${startPos.x},${startPos.y}`, manhattanDistance(startPos, endPos));

    while (openSet.length > 0) {
        openSet.sort((a, b) => (fScore.get(`${a.x},${a.y}`) ?? Infinity) - (fScore.get(`${b.x},${b.y}`) ?? Infinity));
        const current: MapTile = openSet.shift()!;

        if (current.x === endTile.x && current.y === endTile.y) {
            return reconstructPath(cameFrom, current);
        }

        closedSet.add(`${current.x},${current.y}`);

        for (const neighbor of getNeighbors(current, validTiles, width, height, agentsSet)) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (closedSet.has(neighborKey)) continue;
            const tentativeGScore = (gScore.get(`${current.x},${current.y}`) ?? Infinity) + 1;

            if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + manhattanDistance(neighbor, endTile));

                if (!openSet.some(t => t.x === neighbor.x && t.y === neighbor.y)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    throw new Error(`No path found, from ${JSON.stringify(startPos)} to ${JSON.stringify(endPos)}`);
}

/**
 * Calculates the Manhattan distance between two positions.
 * This is the sum of the absolute differences of their Cartesian coordinates.
 * @param posA The first position.
 * @param posB The second position.
 * @returns The Manhattan distance between posA and posB.
 */
function manhattanDistance(posA: Position, posB: Position): number {
    return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
}

/**
 * Retrieves all valid neighboring tiles adjacent to the given tile that are not blocked by obstacles.
 * Only considers neighbors within map bounds and not present in the obstacles set.
 * @param tile The current tile.
 * @param validTiles Map of valid tiles keyed by their coordinates.
 * @param width Map width.
 * @param height Map height.
 * @param obstacles Set of coordinates representing obstacles to avoid.
 * @returns An array of neighboring MapTiles that can be traversed.
 */
function getNeighbors(
    tile: MapTile,
    validTiles: Map<string, MapTile>,
    width: number,
    height: number,
    obstacles: Set<string>
): MapTile[] {
    const neighbors: MapTile[] = [];
    const directions = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 }
    ];

    for (const { dx, dy } of directions) {
        const nx = tile.x + dx;
        const ny = tile.y + dy;
        const neighborKey = `${nx},${ny}`;
        const neighbor = validTiles.get(neighborKey);

        if (neighbor && !obstacles.has(neighborKey) && nx >= 0 && nx < width && ny >= 0 && ny < height) {
            neighbors.push(neighbor);
        }
    }

    return neighbors;
}

/**
 * Reconstructs the path from the start tile to the current tile by backtracking through the cameFrom map.
 * @param cameFrom A map of tile keys to their preceding MapTile on the path.
 * @param current The current tile (usually the end tile).
 * @returns An array of MapTiles representing the path from start to current.
 */
function reconstructPath(cameFrom: Map<string, MapTile>, current: MapTile): MapTile[] {
    const path: MapTile[] = [current];
    let curKey: string = `${current.x},${current.y}`;

    while (cameFrom.has(curKey)) {
        current = cameFrom.get(curKey)!;
        path.unshift(current);
        curKey = `${current.x},${current.y}`;
    }

    return path;
}

/**
 * Converts a sequence of atomic actions into the corresponding sequence of visited tiles on the map.
 * Starts from startPos and applies each action to update the position, collecting the resulting tile.
 * @param startPos The starting position.
 * @param plan An array of atomicActions representing movements.
 * @param mapConfig The map configuration containing tiles.
 * @returns An array of MapTiles visited in order according to the plan.
 */
export function getVisitedTilesFromPlan(startPos: Position, plan: atomicActions[], mapConfig: MapConfig): MapTile[] {
    const visitedTiles: MapTile[] = [];
    let currentPos: Position = { x: startPos.x, y: startPos.y };
    for (const action of plan) {
        switch (action) {
            case atomicActions.moveUp:
                currentPos = { x: currentPos.x, y: currentPos.y - 1 };
                break;
            case atomicActions.moveDown:
                currentPos = { x: currentPos.x, y: currentPos.y + 1 };
                break;
            case atomicActions.moveLeft:
                currentPos = { x: currentPos.x - 1, y: currentPos.y };
                break;
            case atomicActions.moveRight:
                currentPos = { x: currentPos.x + 1, y: currentPos.y };
                break;

            default:
                break;
        }
        visitedTiles.push(mapConfig.tiles.find(tile => tile.x === currentPos.x && tile.y === currentPos.y)!);
    }
    return visitedTiles;
}

/**
 * Computes the optimal path from startPos to endPos considering the current beliefs about the map and obstacles.
 * Gathers positions of agents and teammates as obstacles to avoid collisions.
 * Uses A* pathfinding and returns an empty path if no path is found or if start and end positions are the same.
 * @param startPos The starting position.
 * @param endPos The target position.
 * @param beliefs The belief base containing map and agent information.
 * @returns An array of MapTiles representing the optimal path, or an empty array if no path exists.
 */
export function getOptimalPath(
    startPos: Position,
    endPos: Position,
    beliefs: BeliefBase,
): MapTile[]  {
    const mapConfig = beliefs.getBelief<MapConfig>("map")!;
    if (startPos.x === endPos.x && startPos.y === endPos.y) return [];

    // Get agents' positions as obstacles
    const agents = beliefs.getBelief<Agent[]>(`agents`) || [];
    const obstacles = agents
        .filter(agent => agent.x !== startPos.x || agent.y !== startPos.y)
        .map(agent => ({ x: agent.x, y: agent.y }));

    // Add teammates' positions as obstacles
    const teammatesPositions = beliefs.getBelief<Record<string, Position>>("teammatesPositions") || {};
    for (const pos of Object.values(teammatesPositions)) {
        if (pos.x !== startPos.x || pos.y !== startPos.y) {
            obstacles.push({ x: pos.x, y: pos.y });
        }
    }

    // console.log("obstacles", obstacles);



    try{
        const path = aStarPath(startPos, endPos, mapConfig, obstacles);
        return path;
    }
    catch (e) {
        if (e instanceof Error) {
            //console.error("Error in pathfinding:",e.message); // just the message, no stack trace
        } else {
            console.error(String(e)); // fallback for non-Error objects
        }
        return [];
    }
    
    
    
}

/**
 * Converts a sequence of MapTiles into corresponding atomic movement actions.
 * Derives the direction of movement between consecutive tiles and maps it to the appropriate action.
 * @param path An array of MapTiles representing a path.
 * @returns An array of atomicActions representing movements along the path.
 */
export function convertPathToActions(path: MapTile[]): atomicActions[] {
    const actions: atomicActions[] = [];
    for (let i = 0; i < path.length - 1; i++) {
        const current = path[i];
        const next = path[i + 1];
        if (next.x > current.x) actions.push(atomicActions.moveRight);
        else if (next.x < current.x) actions.push(atomicActions.moveLeft);
        else if (next.y > current.y) actions.push(atomicActions.moveUp);
        else if (next.y < current.y) actions.push(atomicActions.moveDown);
    }
    return actions;
}
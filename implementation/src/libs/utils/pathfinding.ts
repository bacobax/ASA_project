import { MapTile, MapConfig, Position, atomicActions, Agent } from "../../types/types";
import { BeliefBase } from "../beliefs";

export function floydWarshallWithPaths(mapConfig: MapConfig) {
    const { width, height, tiles } = mapConfig;
    const numTiles = width * height;

    const validTiles = new Map<string, MapTile>();
    tiles.forEach(tile => validTiles.set(`${tile.x},${tile.y}`, tile));

    const dist: number[][]= Array.from({ length: numTiles }, () => Array(numTiles).fill(Infinity));
    const prev: number[][] = Array.from({ length: numTiles }, () => Array(numTiles).fill(-1));
    const paths: Map<number, Map<number, MapTile[]>> = new Map();

    for (let y = 0; y < height; y++) {
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

function manhattanDistance(posA: Position, posB: Position): number {
    return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
}

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

export function getOptimalPath(
    startPos: Position,
    endPos: Position,
    mapConfig: MapConfig,
    beliefs: BeliefBase,
): atomicActions[] | null {
    if (startPos.x === endPos.x && startPos.y === endPos.y) return [];

    const agents = beliefs.getBelief<Agent[]>(`agents`) || [];
    const obstacles = agents
        .filter(agent => agent.x !== startPos.x || agent.y !== startPos.y)
        .map(agent => ({ x: agent.x, y: agent.y }));

    try {
        
        const path = aStarPath(startPos, endPos, mapConfig, obstacles);
        return convertPathToActions(path);
    } catch (error) {
        return null;
    }
}

function convertPathToActions(path: MapTile[]): atomicActions[] {
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
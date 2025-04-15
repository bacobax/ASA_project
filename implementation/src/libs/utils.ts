import { MapTile, MapConfig, Position, atomicActions, Agent } from "../types/types";
import { BeliefBase } from "./beliefs";

export function floydWarshallWithPaths(mapConfig: MapConfig) {
    const { width, height, tiles } = mapConfig;
    const numTiles = width * height;

    // Create a map of valid tiles for quick lookup
    const validTiles = new Map<string, MapTile>();
    tiles.forEach(tile => validTiles.set(`${tile.x},${tile.y}`, tile));

    // Distance and predecessor matrices
    const dist: number[][]= Array.from({ length: numTiles }, () => Array(numTiles).fill(Infinity));
    const prev: number[][] = Array.from({ length: numTiles }, () => Array(numTiles).fill(-1));

    // Path storage
    const paths: Map<number, Map<number, MapTile[]>> = new Map();

    // Initialize all possible tiles (even empty ones)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x; // Convert (x, y) to a linear index
            paths.set(i, new Map());

            // If the tile is valid (not a wall), initialize distances
            if (validTiles.has(`${x},${y}`)) {
                dist[i][i] = 0; // Distance to itself is 0

                // Check adjacent tiles (up, down, left, right)
                const neighbors = [
                    { dx: -1, dy: 0 }, // Left
                    { dx: 1, dy: 0 },  // Right
                    { dx: 0, dy: -1 }, // Up
                    { dx: 0, dy: 1 }   // Down
                ];

                for (const { dx, dy } of neighbors) {
                    const nx = x + dx, ny = y + dy;
                    const j = ny * width + nx; // Convert (nx, ny) to linear index

                    if (validTiles.has(`${nx},${ny}`)) {
                        dist[i][j] = 1; // Distance between connected tiles is 1
                        prev[i][j] = i; // Initial predecessor
                        paths.get(i)?.set(j, [validTiles.get(`${x},${y}`)!, validTiles.get(`${nx},${ny}`)!]); // Direct path
                    }
                }
            }
        }
    }

    // Apply Floyd-Warshall Algorithm
    for (let k = 0; k < numTiles; k++) {
        for (let i = 0; i < numTiles; i++) {
            for (let j = 0; j < numTiles; j++) {
                if (dist[i][j] > dist[i][k] + dist[k][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    prev[i][j] = prev[k][j];

                    // Construct path
                    const newPath = [
                        ...(paths.get(i)?.get(k) || []), // Safe fallback for undefined paths
                        ...(paths.get(k)?.get(j)?.slice(1) || [])
                    ];
                    paths.get(i)?.set(j, newPath);
                }
            }
        }
    }

    return { dist, prev, paths };
}

export function getOptimalPath(
    startPos: Position,
    endPos: Position,
    mapWidth: number,
    mapHeight: number,
    mapConfig: MapConfig, // Add mapConfig parameter
    beliefs: BeliefBase // Add beliefs to get agent positions
): atomicActions[] {
    if (startPos.x === endPos.x && startPos.y === endPos.y) return [];

    // Get current agent positions (excluding self)
    const agents = beliefs.getBelief<Agent[]>("agents") || [];
    const obstacles = agents
        .filter(agent => agent.x !== startPos.x || agent.y !== startPos.y)
        .map(agent => ({ x: agent.x, y: agent.y }));

    try {
        const path = aStarPath(startPos, endPos, mapConfig, obstacles);
        return convertPathToActions(path);
    } catch (error) {
        throw new Error("No path found from start to end.");
    }
}

export function getKeyPos(pos: Position):string{
    return (pos.x+","+pos.y);
}

export function getKeyTile(tile: MapTile):string{
    return (tile.x+","+tile.y);
}

// Add these functions to utils.ts
export function aStarPath(startPos: Position, endPos: Position, mapConfig: MapConfig, agents: Position[]): MapTile[] {
    // console.log("a* from:", startPos, " to ", endPos);
    
    const { width, height, tiles } = mapConfig;
    const validTiles = new Map<string, MapTile>();
    tiles.forEach(tile => validTiles.set(getKeyTile(tile), tile));

    const openSet: MapTile[] = [];
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, MapTile>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const startTile = validTiles.get(getKeyPos(startPos));
    const endTile = validTiles.get(getKeyPos(endPos));
    if (!startTile || !endTile) throw new Error("Invalid start or end position");

    const agentsSet = new Set(agents.map(p => `${p.x},${p.y}`));

    openSet.push(startTile);
    gScore.set(getKeyPos(startPos), 0);
    fScore.set(getKeyPos(startPos), manhattanDistance(startPos, endPos));
    
    while (openSet.length > 0) {
        openSet.sort((a, b) => (fScore.get(getKeyTile(a)) ?? Infinity) - (fScore.get(getKeyTile(b)) ?? Infinity));
        const current: MapTile = openSet.shift()!;

        if (current.x === endTile.x && current.y === endTile.y) {
            return reconstructPath(cameFrom, current);
        }

        closedSet.add(getKeyTile(current));

        for (const neighbor of getNeighbors(current, validTiles, width, height, agentsSet)) {
            
            const neighborKey = getKeyTile(neighbor);
            if (closedSet.has(neighborKey)) continue;
            const tentativeGScore = (gScore.get(getKeyTile(current)) ?? Infinity) + 1;
            
            // console.log("tentativeGScore:", tentativeGScore);

            if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + manhattanDistance(neighbor, endTile));
                
                if (!openSet.some(t => t.x === neighbor.x && t.y === neighbor.y)) {
                    openSet.push(neighbor);
                    // console.log("adding ", neighborKey);

                }
            }
        }
    }

    throw new Error("No path found");
}

function manhattanDistance(posA:Position, posB:Position): number{
    return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
}

function heuristic(a: MapTile, b: MapTile, agentsSet: Position[]): number {
    const posA:Position = {x:a.x, y:a.y};
    const posB:Position = {x:b.x, y:b.y};
    let val = 0;
    for(const agent of agentsSet) {
        switch(manhattanDistance(posA, agent)){
            case 1:
                val+= 5;
            case 2:
                val+= 2;   
        }
    }

    return val + manhattanDistance(posA, posB);

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
        const neighborKey = getKeyPos({x:nx, y:ny});
        const neighbor = validTiles.get(neighborKey);
        
        if (neighbor && !obstacles.has(neighborKey) && nx >= 0 && nx < width && ny >= 0 && ny < height) {
            neighbors.push(neighbor);
        }
    }

    return neighbors;
}

function reconstructPath(cameFrom: Map<string, MapTile>, current: MapTile): MapTile[] {
    const path: MapTile[] = [current];
    let curKey:string = getKeyTile(current);
    while (cameFrom.has(curKey)) {
        curKey = getKeyTile(current);
        current = cameFrom.get(curKey)!;
        path.unshift(current);
    }
    return path;
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

export function getTileIndex(pos:Position, mapWidth:number):number{
    return pos.y * mapWidth + pos.x;
}

export function getTilePosition(index:number, mapWidth:number):Position{
    return {y:Math.floor(index/mapWidth), x:index%mapWidth};
}

export function getDeliverySpot(startPos:Position, minMovement:number, beliefs:BeliefBase):Position{
    const deliveries:MapTile[] = beliefs.getBelief("deliveries") as MapTile[];
    const distances: number[][] = beliefs.getBelief("dist") as number[][];
    const map: MapConfig = beliefs.getBelief("map") as MapConfig;
    let minDistance:number = Infinity;
    let minDistancePos;
    for (let i = 0; i < deliveries.length; i++) {
        const pos:Position = {x:deliveries[i].x, y:deliveries[i].y};
        // console.log("----getDeliverySpot i:",i," -----");
        // console.log("startPos:", startPos);
        // console.log("endPos:", pos);
        const dist = distances[getTileIndex(startPos, map.width)][getTileIndex(pos, map.width)];
        if(dist >= minMovement && dist < minDistance){
            minDistance = dist;
            minDistancePos = pos
        }
        
    }

    return minDistancePos as Position;
}


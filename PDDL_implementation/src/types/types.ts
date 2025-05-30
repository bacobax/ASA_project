export interface Position {
    x: number;
    y: number;
}

export interface Intention {
    type: desireType;
    parcelId?: string;
    position?: Position;
    possilbeParcels?: Parcel[];
}

export interface MapTile {
    x: number;
    y: number;
    type?: number
}

export interface MapConfig {
    width: number;
    height: number;
    tiles: MapTile[];
}
 
export interface Agent {
    id: string;
    name: string;
    x: number;
    y: number;
    score: number;
}

export interface AgentLog{
    prevPosition :Position;
    timestamp: number;
}


export interface Parcel {
    id: string;
    x: number;
    y: number;
    carriedBy: string | null;
    reward: number;
}

export interface LogMessage {
    src: "server" | "client";
    timestamp: number;
    socket: string;
    id: string;
    name: string;
}

export enum atomicActions {
    moveRight = "moveRight",
    moveLeft = "moveLeft",
    moveUp = "moveUp",
    moveDown = "moveDown",
    pickup = "pickup",
    drop = "drop",
    wait = "wait",
}

export enum desireType {
    PICKUP = "pickup",
    DELIVER = "deliver",
    MOVE = "move",
}

/**
 * config: {
    MAP_FILE: 'default_map',
    PARCELS_GENERATION_INTERVAL: '2s',
    PARCELS_MAX: '5',
    MOVEMENT_STEPS: 1,
    MOVEMENT_DURATION: 500,
    AGENTS_OBSERVATION_DISTANCE: 5,
    PARCELS_OBSERVATION_DISTANCE: 5,
    AGENT_TIMEOUT: 10000,
    PARCEL_REWARD_AVG: 30,
    PARCEL_REWARD_VARIANCE: 10,
    PARCEL_DECADING_INTERVAL: '1s',
    RANDOMLY_MOVING_AGENTS: 0,
    RANDOM_AGENT_SPEED: '2s',
    CLOCK: 50,
    BROADCAST_LOGS: false
  }
 */
export interface ServerConfig{
    MAP_FILE: string;
    PARCELS_GENERATION_INTERVAL: number | string; //to sanitize
    PARCELS_MAX: string;
    MOVEMENT_STEPS: number;
    MOVEMENT_DURATION: number;
    AGENTS_OBSERVATION_DISTANCE: number;
    PARCELS_OBSERVATION_DISTANCE: number;
    AGENT_TIMEOUT: number;
    PARCEL_REWARD_AVG: number;
    PARCEL_REWARD_VARIANCE: number;
    PARCEL_DECADING_INTERVAL: number | string; //to sanitize
    RANDOMLY_MOVING_AGENTS: number;
    RANDOM_AGENT_SPEED: number | string; //to sanitize
    CLOCK: number;
    BROADCAST_LOGS: boolean;
}
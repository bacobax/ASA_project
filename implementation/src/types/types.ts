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
    delivery: boolean;
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
}

export enum desireType {
    PICKUP = "pickup",
    DELIVER = "deliver",
    MOVE = "move",
}
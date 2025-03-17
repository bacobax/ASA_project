export interface Position {
    x: number;
    y: number;
}

export interface Intention {
    type: "pickup" | "deliver" | "move";
    parcelId?: string;
    position?: Position;
}

export interface MapTile {
    position: Position;
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
    position: Position;
    score: number;
}

export interface Parcel {
    id: string;
    position: Position;
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
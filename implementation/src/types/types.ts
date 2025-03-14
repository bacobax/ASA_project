export interface Position {
    x: number;
    y: number;
}

export interface Intention {
    type: "pickup" | "deliver";
    parcelId?: string;
    x?: number;
    y?: number;
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
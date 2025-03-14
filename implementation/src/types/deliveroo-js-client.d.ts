// import { Socket } from "socket.io-client";
// import { EventEmitter } from "events";

interface MapTile {
    x: number;
    y: number;
    delivery: boolean;
}

interface MapConfig {
    width: number;
    height: number;
    tiles: MapTile[];
}

interface Agent {
    id: string;
    name: string;
    x: number;
    y: number;
    score: number;
}

interface Parcel {
    id: string;
    x: number;
    y: number;
    carriedBy: string | null;
    reward: number;
}

interface LogMessage {
    src: "server" | "client";
    timestamp: number;
    socket: string;
    id: string;
    name: string;
}

declare module '@unitn-asa/deliveroo-js-client' {
    export class DeliverooApi /*extends EventEmitter*/{
        

        constructor(host: string, token?: string);

        onConnect(callback: () => void): void;
        onDisconnect(callback: () => void): void;
        onTile(callback: (x: number, y: number, delivery: boolean) => void): void;
        onNotTile(callback: (x: number, y: number) => void): void;
        onMap(callback: (width: number, height: number, tiles: MapTile[]) => void): void;
        onYou(callback: (data: Agent) => void): void;
        onAgentsSensing(callback: (agents: Agent[]) => void): void;
        onParcelsSensing(callback: (parcels: Parcel[]) => void): void;
        onMsg(callback: (id: string, name: string, msg: string, replyAcknowledgmentCallback: (response: string) => void) => void): void;
        // onLog(callback: (log: LogMessage, ...message: any[]) => void): void;
        // onConfig(callback: (config: any) => void): void;

        // timer(ms: number): Promise<void>;
        move(direction: "up" | "right" | "left" | "down"): Promise<{ x: number; y: number } | false>;
        pickup(): Promise<number[]>;
        putdown(selected?: string[]): Promise<number[]>;
        say(toId: string, msg: string): Promise<boolean>;
        ask(toId: string, msg: string): Promise<string>;
        shout(msg: string): Promise<boolean>;
    }
}

import { io, Socket } from "socket.io-client";
import { EventEmitter } from "events";

export class DeliverooApi extends EventEmitter {
    private socket: Socket;

    constructor(host: string, token: string) {
        super();
        this.socket = io(host, { extraHeaders: { 'x-token': token } });

        this.socket.on("you", data => this.emit("you", data));
        this.socket.on("parcels sensing", parcels => this.emit("parcelsSensing", parcels));
        this.socket.on("agents sensing", agents => this.emit("agentsSensing", agents));
    }

    async move(direction: string): Promise<void> {
        return new Promise(resolve => this.socket.emit("move", direction, resolve));
    }

    async pickup(): Promise<void> {
        return new Promise(resolve => this.socket.emit("pickup", resolve));
    }

    async putdown(): Promise<void> {
        return new Promise(resolve => this.socket.emit("putdown", resolve));
    }
}
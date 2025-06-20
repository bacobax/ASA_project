declare module "@unitn-asa/deliveroo-js-client" {
    import { Intention, MapTile, MapConfig, Agent, Parcel } from "./types";
    export class DeliverooApi extends EventEmitter {
        constructor(host: string, token?: string);

        onConnect(callback: () => void): void;
        onDisconnect(callback: () => void): void;
        onTile(
            callback: (x: number, y: number, delivery: boolean) => void
        ): void;
        onNotTile(callback: (x: number, y: number) => void): void;
        onMap(
            callback: (width: number, height: number, tiles: MapTile[]) => void
        ): void;
        on(
            event: string,
            //anyargs callback: (...args: any[]) => void
            callback: (...args: any[]) => void
        )
        once(
            event: string,
            //anyargs callback: (...args: any[]) => void
            callback: (...args: any[]) => void
        )
        onYou(callback: (data: Agent) => void): void;
        onAgentsSensing(callback: (agents: Agent[]) => void): void;
        onParcelsSensing(callback: (parcels: Parcel[]) => void): void;
        onMsg(
            callback: (
                id: string,
                name: string,
                msg: string,
                replyAcknowledgmentCallback: (response: string) => void
            ) => void
        ): void;
        // onLog(callback: (log: LogMessage, ...message: any[]) => void): void;
        onConfig(callback: (config: any) => void): void;

        // timer(ms: number): Promise<void>;
        emitMove(
            direction: "up" | "right" | "left" | "down"
        ): Promise<{ x: number; y: number } | false>;
        emitPickup(): Promise<number[]>;
        emitPutdown(selected?: string[]): Promise<number[]>;
        emitSay(toId: string, msg: string): Promise<boolean>;
        emitAsk(toId: string, msg: string): Promise<string>;
        emitShout(msg: string): Promise<boolean>;
    }
}

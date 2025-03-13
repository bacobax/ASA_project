declare module '@unitn-asa/deliveroo-js-client' {
    export class DeliverooApi {
        constructor(host: string, token: string);
        onYou(callback: (data: {
            id: string;
            name: string;
            x: number;
            y: number;
            score: number;
        }) => void): void;
        onParcelsSensing(callback: (parcels: any[]) => void): void;
        // Add other methods as needed
    }
}
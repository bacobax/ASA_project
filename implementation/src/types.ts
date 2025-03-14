export interface Position {
    x: number;
    y: number;
}

export interface Parcel {
    id: string;
    x: number;
    y: number;
}

export interface Intention {
    type: "pickup" | "deliver";
    parcelId?: string;
    x?: number;
    y?: number;
}
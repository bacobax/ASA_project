import { default as config } from "../config.js";

interface CommandArg {
    name: string;
    value: string;
}

interface Position {
    x: number;
    y: number;
}

interface Parcel {
    id: string;
    x: number;
    y: number;
    carriedBy?: string;
}

interface KnowledgeBase {
    me: Position;
    parcels: Map<string, Parcel>;
}

interface Option {
    desire: string;
    args: any[];
}

type OptionCollectionFunction = (KB: KnowledgeBase) => Option[];
type OptionSelectionFunction = (options: Option[], KB: KnowledgeBase) => Option | undefined;

export function process_cmd_args(requested_args: string[]): string[] {
    let args: string[] = [];
    process.argv.forEach(function (val: string) {
        requested_args.forEach(function (arg: string) {
            if (val.startsWith(arg)) {
                args.push(val.split("=")[1]);
            }
        });
    });
    return args;
}

export function parseTokens(n_required: number): string[] | null {
    const cmd_tokens = process_cmd_args(["-token="]);
    let result_tokens = config.tokens;

    if (cmd_tokens.length >= 1) {
        if (cmd_tokens.length < n_required) {
            console.error("Not enough tokens provided in cmd line arguments");
            return null;
        } else {
            return cmd_tokens.slice(0, n_required);
        }
    } else {
        if (result_tokens.length < n_required) {
            console.error("Not enough tokens provided in config file");
            return null;
        } else {
            result_tokens = result_tokens.slice(0, n_required);
            return result_tokens;
        }
    }
}

export function distance(pos1: Position, pos2: Position): number {
    const dx = Math.abs(Math.round(pos1.x) - Math.round(pos2.x));
    const dy = Math.abs(Math.round(pos1.y) - Math.round(pos2.y));
    return dx + dy;
}

export const baseOptionCollection: OptionCollectionFunction = (KB) => {
    const options: Option[] = [];
    for (const [id, parcel] of KB.parcels.entries()) {
        if (parcel.carriedBy) continue;
        options.push({
            desire: "go_pick_up",
            args: [parcel],
        });
    }
    return options;
};

export const baseOptionSelection: OptionSelectionFunction = (options, KB) => {
    let best_option: Option | undefined;
    let nearest_distance = Number.MAX_VALUE;
    
    for (const option of options) {
        if (option.desire != "go_pick_up") continue;
        const parcel = option.args[0] as Parcel;
        const distance_to_option = distance(KB.me, parcel);
        if (distance_to_option < nearest_distance) {
            best_option = option;
            nearest_distance = distance_to_option;
        }
    }
    return best_option;
};

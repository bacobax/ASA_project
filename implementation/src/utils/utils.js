import { default as config } from "../config.js";

export function process_cmd_args(requested_args) {
    let args = [];
    process.argv.forEach(function (val, index, array) {
        requested_args.forEach(function (arg) {
            if (val.startsWith(arg)) {
                args.push(val.split("=")[1]);
            }
        });
    });
    return args;
}

export function parseTokens(n_required) {
    tokens = config.tokens;
    cmd_tokens = process_cmd_args(["-token="]);
    if (processed_token.length >= 1) {
        if (processed_token.length < n_required) {
            console.error("Not enough tokens provided in cmd line arguments");
            return;
        } else {
            tokens = processed_token.slice(0, n_required);
            return tokens;
        }
    } else {
        if (tokens.length < n_required) {
            console.error("Not enough tokens provided in config file");
            return;
        } else {
            tokens = tokens.slice(0, n_required);
        }
    }
}

export function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2));
    const dy = Math.abs(Math.round(y1) - Math.round(y2));
    return dx + dy;
}

export const baseOptionCollection = (KB) => {
    const options = [];
    for (const [id, parcel] of KB.parcels.entries()) {
        if (parcel.carriedBy) continue;
        options.push({
            desire: "go_pick_up",
            args: [parcel],
        });
    }
    return options;
};

export const baseOptionSelection = (options) => {
    let best_option;
    let nearest_distance = Number.MAX_VALUE;
    for (const option of options) {
        if (option.desire != "go_pick_up") continue;
        const [parcel] = option;
        const distance_to_option = distance(me, parcel);
        if (distance_to_option < nearest_distance) {
            best_option = option;
            nearest_distance = distance_to_option;
        }
    }
    return best_option;
};

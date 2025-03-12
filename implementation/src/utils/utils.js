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

export function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2));
    const dy = Math.abs(Math.round(y1) - Math.round(y2));
    return dx + dy;
}

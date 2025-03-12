export function init_sockets(client, agent) {
    client.onYou(({ id, name, x, y, score }) => {
        me.id = id;
        me.name = name;
        me.x = x;
        me.y = y;
        me.score = score;
    });
    const parcels = new Map();

    client.onParcelsSensing(async (perceived_parcels) => {
        console.log("UPDATO PARCELS");
        for (const p of perceived_parcels) {
            parcels.set(p.id, p);
        }
    });
}

import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import config from "./config.js";

function API_test() {
    const client = new DeliverooApi(config.host, config.tokens[0]);

    client.onYou(({ id, name, x, y, score }) => {
        console.log("--------ON YOU--------");
        console.log(
            "id: ",
            id,
            "name: ",
            name,
            "x: ",
            x,
            "y: ",
            y,
            "score: ",
            score
        );
    });

    client.onParcelsSensing(async (perceived_parcels) => {
        // console.log("--------ON PARCELS SENSING--------");
        // console.log("perceived_parcels: ", perceived_parcels);
    });

    client.onMap((width, height, map) => {
        console.log("--------ON MAP--------");
        console.log("width: ", width, "height: ", height);
        console.log("map: ", map);
    });

    client.onTile((x, y, delivery) => {
        console.log("--------ON TILE--------");
        console.log("x: ", x, "y: ", y, "delivery: ", delivery);
    });

    client.onNotTile((x, y) => {
        console.log("--------ON NOT TILE--------");
        console.log("x: ", x, "y: ", y);
    });
}

API_test();

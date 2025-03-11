const jwt = require("jsonwebtoken");
const { uid } = require("uid");

const SUPER_SECRET = process.env.SUPER_SECRET || "default_token_private_key";

const default_name = "MULTI_";
const n = 10;

for (let i = 0; i < n; i++) {
    const name = default_name + i;
    id = uid();
    token = jwt.sign({ id, name }, SUPER_SECRET);
    console.log(`${name}: ${token}`);
}

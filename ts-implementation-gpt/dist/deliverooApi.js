"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliverooApi = void 0;
const socket_io_client_1 = require("socket.io-client");
const events_1 = require("events");
class DeliverooApi extends events_1.EventEmitter {
    constructor(host, token) {
        super();
        this.socket = (0, socket_io_client_1.io)(host, { extraHeaders: { 'x-token': token } });
        this.socket.on("you", data => this.emit("you", data));
        this.socket.on("parcels sensing", parcels => this.emit("parcelsSensing", parcels));
        this.socket.on("agents sensing", agents => this.emit("agentsSensing", agents));
    }
    move(direction) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => this.socket.emit("move", direction, resolve));
        });
    }
    pickup() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => this.socket.emit("pickup", resolve));
        });
    }
    putdown() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => this.socket.emit("putdown", resolve));
        });
    }
}
exports.DeliverooApi = DeliverooApi;

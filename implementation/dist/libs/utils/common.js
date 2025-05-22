"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Strategies = exports.getConfig = exports.writeConfigs = exports.sanitizeConfigs = exports.cachedServerConfigs = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.cachedServerConfigs = {
    MAP_FILE: undefined,
    PARCELS_GENERATION_INTERVAL: undefined,
    PARCELS_MAX: undefined,
    MOVEMENT_STEPS: undefined,
    MOVEMENT_DURATION: undefined,
    AGENTS_OBSERVATION_DISTANCE: undefined,
    PARCELS_OBSERVATION_DISTANCE: undefined,
    AGENT_TIMEOUT: undefined,
    PARCEL_REWARD_AVG: undefined,
    PARCEL_REWARD_VARIANCE: undefined,
    PARCEL_DECADING_INTERVAL: undefined,
    RANDOMLY_MOVING_AGENTS: undefined,
    RANDOM_AGENT_SPEED: undefined,
    CLOCK: undefined,
    BROADCAST_LOGS: undefined,
};
const sanitizeConfigs = (configs) => {
    const { PARCELS_GENERATION_INTERVAL, PARCEL_DECADING_INTERVAL, RANDOM_AGENT_SPEED } = configs, rest = __rest(configs, ["PARCELS_GENERATION_INTERVAL", "PARCEL_DECADING_INTERVAL", "RANDOM_AGENT_SPEED"]);
    const toSanitize = [
        PARCELS_GENERATION_INTERVAL,
        PARCEL_DECADING_INTERVAL,
        RANDOM_AGENT_SPEED,
    ];
    const sanitized = toSanitize.map(prop => {
        const value = parseInt(prop);
        const unit = prop.replace(/[0-9]/g, '');
        switch (unit) {
            case 's':
                return value * 1000;
            case 'ms':
                return value;
            case 'h':
                return value * 60 * 60 * 1000;
            case 'm':
                return value * 60 * 1000;
            case 'frame':
                const clock = (0, exports.getConfig)('CLOCK');
                if (!clock) {
                    throw new Error('CLOCK is not defined');
                }
                return clock; // 60fps
            default:
                throw new Error(`Invalid time unit: ${unit}`);
        }
    });
    return Object.assign(Object.assign({}, rest), { PARCELS_GENERATION_INTERVAL: sanitized[0], PARCEL_DECADING_INTERVAL: sanitized[1], RANDOM_AGENT_SPEED: sanitized[2] });
};
exports.sanitizeConfigs = sanitizeConfigs;
const writeConfigs = (configs) => {
    // Ensure the store directory exists
    const storeDir = path.join(__dirname, '../store');
    if (!fs.existsSync(storeDir)) {
        fs.mkdirSync(storeDir, { recursive: true });
    }
    // Write the sanitized config to file
    const configPath = path.join(storeDir, 'serverConfigs.json');
    fs.writeFileSync(configPath, JSON.stringify(configs, null, 2));
};
exports.writeConfigs = writeConfigs;
const getConfig = (key) => {
    const cached = exports.cachedServerConfigs[key];
    if (cached !== undefined) {
        return cached;
    }
    const configPath = path.join(__dirname, '../store/serverConfigs.json');
    const rawConfigs = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const value = rawConfigs[key];
    exports.cachedServerConfigs[key] = value;
    return value;
};
exports.getConfig = getConfig;
var Strategies;
(function (Strategies) {
    Strategies["linear"] = "linear";
    Strategies["aggressive"] = "aggressive";
    Strategies["sophisticated"] = "sophisticated";
})(Strategies || (exports.Strategies = Strategies = {}));

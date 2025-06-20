import { ServerConfig } from "../../types/types";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Cached server configuration values. Used to cache configuration values for performance.
 */
interface CachedServerConfigs{
    MAP_FILE: string | undefined;
    PARCELS_GENERATION_INTERVAL: number |  undefined;
    PARCELS_MAX: number | undefined;
    MOVEMENT_STEPS: number | undefined;
    MOVEMENT_DURATION: number | undefined;
    AGENTS_OBSERVATION_DISTANCE: number | undefined;
    PARCELS_OBSERVATION_DISTANCE: number | undefined;
    AGENT_TIMEOUT: number | undefined;
    PARCEL_REWARD_AVG: number | undefined;
    PARCEL_REWARD_VARIANCE: number | undefined;
    PARCEL_DECADING_INTERVAL: number | string | undefined;
    RANDOMLY_MOVING_AGENTS: number | undefined;
    RANDOM_AGENT_SPEED: number | undefined;
    CLOCK: number | undefined;
    BROADCAST_LOGS: boolean | undefined;
    
}
/**
 * The singleton cache object for server configuration values.
 */
export const cachedServerConfigs: CachedServerConfigs = {
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
}


/**
 * Type representing the raw server configuration as loaded from file.
 * Some fields are strings that need to be sanitized to appropriate types.
 */
export interface RawServerConfig{
    MAP_FILE: string;
    PARCELS_GENERATION_INTERVAL: string; //to sanitize
    PARCELS_MAX: string;
    MOVEMENT_STEPS: number;
    MOVEMENT_DURATION: number;
    AGENTS_OBSERVATION_DISTANCE: number;
    PARCELS_OBSERVATION_DISTANCE: number;
    AGENT_TIMEOUT: number;
    PARCEL_REWARD_AVG: number;
    PARCEL_REWARD_VARIANCE: number;
    PARCEL_DECADING_INTERVAL: string; //to sanitize
    RANDOMLY_MOVING_AGENTS: number;
    RANDOM_AGENT_SPEED: string; //to sanitize
    CLOCK: number;
    BROADCAST_LOGS: boolean;
}

/**
 * Converts a RawServerConfig object to a sanitized ServerConfig.
 * Converts string values (e.g., time intervals) to numbers and handles special units.
 * @param configs - The raw server configuration object.
 * @returns The sanitized ServerConfig object.
 */
export const sanitizeConfigs = (configs: RawServerConfig): ServerConfig => {
    const {
        PARCELS_GENERATION_INTERVAL,
        PARCEL_DECADING_INTERVAL,
        RANDOM_AGENT_SPEED,
        ...rest
    } = configs;
    const toSanitize = [
        PARCELS_GENERATION_INTERVAL,
        PARCEL_DECADING_INTERVAL,
        RANDOM_AGENT_SPEED,
    ]
   const sanitized = toSanitize.map(prop => {
       if (prop === "infinite") return Infinity;
       const value = parseInt(prop);
       const unit = prop.replace(/[0-9]/g, '');
       switch(unit) {
           case 's':
               return value * 1000;
           case 'ms':
               return value;
           case'h':
               return value * 60 * 60 * 1000;
           case'm':
               return value * 60 * 1000;
            case 'frame':
                const clock = getConfig<number>('CLOCK');
                if (!clock) {
                    throw new Error('CLOCK is not defined');
                }
                return clock; // 60fps
           default:
               throw new Error(`Invalid time unit: ${unit}`);
       }
   });

   return {
       ...rest,
       PARCELS_GENERATION_INTERVAL: sanitized[0],
       PARCEL_DECADING_INTERVAL: sanitized[1],
       RANDOM_AGENT_SPEED: sanitized[2],
   }
}

/**
 * Writes the server configuration to a JSON file in the store directory.
 * @param configs - The sanitized ServerConfig object to write.
 */
export const writeConfigs = (configs: ServerConfig) => {
   // Ensure the store directory exists
   const storeDir = path.join(__dirname, '../store');
   if (!fs.existsSync(storeDir)) {
       fs.mkdirSync(storeDir, { recursive: true });
   }
   // Write the sanitized config to file
   const configPath = path.join(storeDir, 'serverConfigs.json');
   fs.writeFileSync(configPath, JSON.stringify(configs, null, 2));
}

/**
 * Retrieves a configuration value by key, using the cache if available.
 * Reads from the configuration file and caches the result if not cached.
 * @template T - The expected type of the configuration value.
 * @param key - The configuration key.
 * @returns The configuration value, or undefined/null if not found.
 */
export const getConfig = <T>(key: string): T|undefined|null => {
    const cached = cachedServerConfigs[key as keyof CachedServerConfigs];
    if (cached !== undefined) {

        return cached as T;
    }

    const configPath = path.join(__dirname, '../store/serverConfigs.json');
    const rawConfigs = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    const value = rawConfigs[key as keyof ServerConfig] as T;
    (cachedServerConfigs[key as keyof CachedServerConfigs] as any) = value;

    return value;
    
}


/**
 * Enum of agent strategies.
 */
export enum Strategies{
    linear = "linear",
    aggressive = "aggressive",
    sophisticated = "sophisticated",
}


/**
 * Zips two arrays together into an array of pairs.
 * Throws an error if the arrays are not of the same length.
 * @template T - The type of elements in the first array.
 * @template U - The type of elements in the second array.
 * @param a - The first array.
 * @param b - The second array.
 * @returns An array of [T, U] pairs.
 */
export const zip = <T, U>(a: T[], b: U[]): [T, U][] => {
    if (a.length !== b.length) {
      throw new Error("Both arrays must be of the same length");
    }
    if (a.length === 0) return [];
  
    const [firstA, ...restA] = a;
    const [firstB, ...restB] = b;
    return [[firstA, firstB], ...zip(restA, restB)];
};
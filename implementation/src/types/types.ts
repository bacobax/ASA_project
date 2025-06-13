/**
 * Represents a 2D position on the grid. Used to track locations of agents, parcels, and tiles.
 * Encapsulating x and y coordinates in a type ensures consistency and readability across the app.
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * Holds additional contextual information for an agent's intention.
 * Optional fields allow for different intention types (pickup, delivery, move, etc.) without enforcing irrelevant data.
 */
export interface IntentionDetails {
    deliverySpot?: Position;
    parcelsToPickup?: Parcel[];
    targetPosition?: Position;
}

/**
 * Describes an agent's current goal along with relevant metadata.
 * `possibleParcels` helps in decision-making, especially for planning and selecting the optimal parcel.
 */
export interface Intention {
    type: desireType;
    details?: IntentionDetails;
    possibleParcels?: Parcel[];
}

/**
 * Represents a tile on the map, optionally with a type to allow for various terrain or object types.
 * The abstraction allows flexible map modeling and scalability for adding features (e.g., obstacles).
 */
export interface MapTile {
    x: number;
    y: number;
    type?: number;
}

/**
 * Defines the full structure of the game/map environment.
 * `tiles` is an array of MapTile entries, enabling flexible and granular environment modeling.
 */
export interface MapConfig {
    width: number;
    height: number;
    tiles: MapTile[];
}

/**
 * Represents an agent (autonomous unit) within the simulation.
 * Keeps track of the agent’s position, identity, and score for game logic and metrics.
 */
export interface Agent {
    id: string;
    name: string;
    x: number;
    y: number;
    score: number;
}

/**
 * Records an agent's past location and timestamp, used for logging, debugging, or learning strategies.
 * This allows tracking agent behavior over time.
 */
export interface AgentLog {
    prevPosition: Position;
    timestamp: number;
}

/**
 * Represents a parcel in the simulation that can be picked up and delivered by agents.
 * Includes reward and carrier tracking, which is critical for scoring and agent planning.
 */
export interface Parcel {
    id: string;
    x: number;
    y: number;
    carriedBy: string | null;
    reward: number;
}

/**
 * Represents a message in the system logs, either from server or client.
 * Useful for debugging, analytics, and post-mortem investigations.
 */
export interface LogMessage {
    src: "server" | "client";
    timestamp: number;
    socket: string;
    id: string;
    name: string;
}

/**
 * Enumerates atomic actions an agent can perform.
 * Having an enum guarantees type-safety and standardization across all movement logic.
 */
export enum atomicActions {
    moveRight = "moveRight",
    moveLeft = "moveLeft",
    moveUp = "moveUp",
    moveDown = "moveDown",
    pickup = "pickup",
    drop = "drop",
    wait = "wait",
}

/**
 * Enumerates high-level goals that an agent can pursue.
 * Differentiates between roles (e.g., courier vs. explorer), allowing modular and specialized behavior.
 */
export enum desireType {
    PICKUP = "pickup",
    DELIVER = "deliver",
    MOVE = "move",
    COURIER_MOVE = "courier_move",
    COURIER_PICKUP = "courier_pickup",
    COURIER_DELIVER = "courier_deliver",
    EXPLORER_MOVE = "explorer_move",
    EXPLORER_PICKUP = "explorer_pickup",
    EXPLORER_DELIVER = "explorer_deliver",
    EXPLORER_DELIVER_ON_PATH = "explorer_deliver_on_path",
}

/**
 * Defines the configuration used by the server to initialize and run the simulation.
 * String-typed durations must be sanitized into numbers. This structure centralizes tunable parameters,
 * enabling easy adjustment and experimentation.
 */
export interface ServerConfig {
    MAP_FILE: string;
    PARCELS_GENERATION_INTERVAL: number; //to sanitize
    PARCELS_MAX: string;
    MOVEMENT_STEPS: number;
    MOVEMENT_DURATION: number;
    AGENTS_OBSERVATION_DISTANCE: number;
    PARCELS_OBSERVATION_DISTANCE: number;
    AGENT_TIMEOUT: number;
    PARCEL_REWARD_AVG: number;
    PARCEL_REWARD_VARIANCE: number;
    PARCEL_DECADING_INTERVAL: number; //to sanitize
    RANDOMLY_MOVING_AGENTS: number;
    RANDOM_AGENT_SPEED: number; //to sanitize
    CLOCK: number;
    BROADCAST_LOGS: boolean;
}

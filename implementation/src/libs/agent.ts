import { BeliefBase } from "./beliefs";
import { DesireGenerator } from "./desire";
import { IntentionManager } from "./intentions";
import { planFor, createPlanExecutor } from "./planner";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { floydWarshallWithPaths } from "./utils/pathfinding";

import {
    MapConfig,
    Position,
    atomicActions,
    AgentLog,
    Intention,
    desireType,
    Agent,
    Parcel,
    MapTile,
} from "../types/types";
import {
    COLLABORATION_TIMEOUT,
    MAX_AGENT_LOGS,
    MAX_BLOCK_RETRIES,
    RESQUEST_TIMEOUT_RANGE,
    WAIT_FOR_AGENT_MOVE_ON,
} from "../config";
import {
    getConfig,
    sanitizeConfigs,
    Strategies,
    writeConfigs,
} from "./utils/common";

import {
    calculateMidpoint,
    canReachDeliverySpot,
    canReachSpawnableSpot,
} from "./utils/mapUtils";
import { handleOnMessage,sendAvailabilityMessage, sendIntentionUpdateMessage } from "./multiAgents";


/**
 * Represents a BDI (Belief-Desire-Intention) agent operating in the Deliveroo environment.
 * Manages internal state, communication, planning, and decision-making processes.
 */
export class AgentBDI {
    private api: DeliverooApi;

    private beliefs: BeliefBase = new BeliefBase();
    private desires = new DesireGenerator();
    private intentions = new IntentionManager();

    /**
     * Maps each atomic action to the corresponding function that sends the appropriate API call.
     */
    private atomicActionToApi = new Map<
        atomicActions,
        (api: DeliverooApi) => Promise<any>
    >();

    /**
     * The plan currently being executed by the agent.
     */
    private currentPlan: atomicActions[] = [];

    /**
     * Promise tracking the ongoing execution of the current plan.
     */
    private planPromise: Promise<void> | null = null;

    /**
     * Flag used to signal that the current plan should be aborted.
     */
    private planAbortSignal = false;

    /**
     * Timestamp of the last successful collaboration to manage timeouts.
     */
    private lastCollaborationTime: number | null = null;

    /**
     * Timestamp of the next allowable request to avoid spamming teammates.
     */
    private nextRequestTime = Date.now();

    /**
     * Synchronization flags used to delay the agent's decision loop until all startup data is received.
     */
    private startSemaphore = {
        // True when the agent's own position and ID info has been received.
        onYou: false,
        // True when the map and associated structures have been received.
        onMap: false,
        // True when configuration values have been received.
        onConfig: false,
    };

    /**
     * Creates an instance of the BDI agent with initial beliefs, strategy, and API bindings.
     * @param api Deliveroo API instance for interacting with the environment.
     * @param strategy Strategy the agent will follow (e.g., aggressive, collaborative).
     * @param teamId The identifier for the agent's team.
     * @param teammatesIds The identifiers of the agent's teammates.
     * @param id The unique identifier of the agent.
     */
    constructor(
        api: DeliverooApi,
        strategy: Strategies,
        teamId: string,
        teammatesIds: string[],
        id: string
    ) {
        this.beliefs.updateBelief("teamId", teamId);
        this.beliefs.updateBelief("teammatesIds", teammatesIds);

        this.api = api;
        this.beliefs.updateBelief("strategy", strategy);
        console.log(`Strategy: ${strategy}`);
        this.initActionHandlers();
        this.setupSocketHandlers();
    }

    /**
     * Initializes the mapping of atomic actions to corresponding API calls.
     */
    private initActionHandlers(): void {
        this.atomicActionToApi.set(atomicActions.moveRight, (api) =>
            api.emitMove("right")
        );
        this.atomicActionToApi.set(atomicActions.moveLeft, (api) =>
            api.emitMove("left")
        );
        this.atomicActionToApi.set(atomicActions.moveUp, (api) =>
            api.emitMove("up")
        );
        this.atomicActionToApi.set(atomicActions.moveDown, (api) =>
            api.emitMove("down")
        );
        this.atomicActionToApi.set(atomicActions.pickup, (api) =>
            api.emitPickup()
        );
        this.atomicActionToApi.set(atomicActions.drop, (api) =>
            api.emitPutdown()
        );
        this.atomicActionToApi.set(atomicActions.wait, async (_) => {
            await new Promise((res) =>
                setTimeout(
                    res,
                    this.beliefs.getBelief<number>("MOVEMENT_DURATION")
                )
            );
            return true;
        });
    }
    /**
     * Starts the agent's decision-making loop after all initial data is received.
     */
    public play(): void {
        if (
            !this.startSemaphore.onYou ||
            !this.startSemaphore.onMap ||
            !this.startSemaphore.onConfig
        ) {
            setTimeout(() => this.play(), 1000);
            return;
        }
        const movementDuration = getConfig<number>("MOVEMENT_DURATION")!;
        setInterval(
            () => this.deliberate().catch(console.error),
            movementDuration * 2
        );
    }
    /**
     * Sets up socket message handlers to process agent state updates and environment changes.
     */
    private setupSocketHandlers(): void {
        this.api.onMsg(
            handleOnMessage({
                beliefs: this.beliefs,
                intentions: this.intentions,
                api: this.api,
                needHelp: this.needHelp.bind(this),
                setLastCollaborationTime: (time) => {
                    this.lastCollaborationTime = time;
                },
                stopCurrentPlan: this.stopCurrentPlan.bind(this),
            })
        );

        this.api.onYou((data) => {
            const position = { x: Math.round(data.x), y: Math.round(data.y) };
            this.beliefs.updateBelief("position", position);
            let lastVisited = this.beliefs.getBelief<number[][]>("lastVisited");
            if (!lastVisited) {
                const map = this.beliefs.getBelief<MapConfig>("map");
                if (map) {
                    let lastVisitedNew: number[][] = new Array(map.width)
                        .fill(-Infinity)
                        .map(() => new Array(map.height).fill(-Infinity));
                    lastVisitedNew[position.x][position.y] = Date.now();
                    this.beliefs.updateBelief("lastVisited", lastVisitedNew);
                }
            } else {
                lastVisited[position.x][position.y] = Date.now();
                this.beliefs.updateBelief("lastVisited", lastVisited);
            }

            this.beliefs.updateBelief("id", data.id);
            this.beliefs.updateBelief("score", data.score);
            this.startSemaphore.onYou = true;

            //send message to teammates with our position
            const teammatesIds =
                this.beliefs.getBelief<string[]>("teammatesIds");
            if (teammatesIds && teammatesIds.length > 0) {
                for (const teammateId of teammatesIds) {
                    this.api.emitSay(
                        teammateId,
                        JSON.stringify({
                            type: "position_update",
                            data: {
                                position,
                                id: data.id,
                                name: data.name,
                            },
                        })
                    );
                }
            }
        });

        this.api.onParcelsSensing((parcels) => {
            this.beliefs.updateBelief("visibleParcels", parcels);
            this.intentions.reviseIntentions(this.beliefs);
        });

        this.api.onAgentsSensing((agents) => {
            this.beliefs.updateBelief("agents", agents);
            const timestamp = Date.now();
            for (const agent of agents) {
                const logs: AgentLog[] = this.beliefs.getBelief(agent.id) ?? [];
                logs.push({
                    prevPosition: { x: agent.x, y: agent.y },
                    timestamp,
                });
                if (logs.length > MAX_AGENT_LOGS) {
                    logs.shift(); // Keep only the last MAX_AGENT_LOGS logs
                }
                this.beliefs.updateBelief(agent.id, logs);
            }
        });

        this.api.once(
            "map",
            (width: number, height: number, tiles: MapTile[]) => {
                const validTiles = tiles.filter((t) => t.type !== 0);

                let mapTypes = new Array(width)
                    .fill(0)
                    .map(() => new Array(height).fill(0));
                for (const tile of validTiles) {
                    mapTypes[tile.x][tile.y] = tile.type;
                }

                const map: MapConfig = { width, height, tiles: validTiles };
                this.beliefs.updateBelief("map", map);
                this.beliefs.updateBelief("mapTypes", mapTypes);
                this.beliefs.updateBelief(
                    "deliveries",
                    tiles.filter((tile) => tile.type == 2)
                );
                this.beliefs.updateBelief(
                    "spawnables",
                    tiles.filter((tile) => tile.type == 1)
                );
                console.log("Computing Floyd-Warshall algorithm...");
                console.time("floydWarshallWithPaths");
                const { dist, prev, paths } = floydWarshallWithPaths(map);
                console.timeEnd("floydWarshallWithPaths");
                this.beliefs.updateBelief("dist", dist);
                this.beliefs.updateBelief("prev", prev);
                this.beliefs.updateBelief("paths", paths);

                this.startSemaphore.onMap = true;
            }
        );

        this.api.onConfig((config) => {
            const sanitized = sanitizeConfigs(config);
            console.log({ sanitized });
            writeConfigs(sanitized);
            this.startSemaphore.onConfig = true;
        });
    }

    /**
     * Determines whether the agent should request help from teammates.
     * @returns True if help is needed, otherwise false.
     */
    private needHelp() {
        const reachSpawnable = canReachSpawnableSpot(this.beliefs);
        const isCollaborating =
            this.beliefs.getBelief<boolean>("isCollaborating");
        const currentIntention = this.intentions.getCurrentIntention();

        const isMoveOrNull =
            !currentIntention || currentIntention.type !== desireType.MOVE;

        return reachSpawnable && !isCollaborating && isMoveOrNull;
    }

    /**
     * Main reasoning cycle where the agent evaluates intentions and generates plans to act.
     */
    private async deliberate(): Promise<void> {
        if (
            this.lastCollaborationTime &&
            Date.now() - this.lastCollaborationTime > COLLABORATION_TIMEOUT
        ) {
            console.log("Collaboration timeout reached, resetting beliefs.");
            sendAvailabilityMessage(this.beliefs, this.api, false);

            this.lastCollaborationTime = null;
        }

        this.intentions.reviseIntentions(this.beliefs);
        const currentIntention = this.intentions.getCurrentIntention();

        if (!currentIntention || this.planAbortSignal) {
            console.log("Deliberating...");
            if (this.planPromise) {
                this.stopCurrentPlan();
            }

            const attemptedHelp = this.beliefs.getBelief<boolean>(
                "attemptingToHelpTeammate"
            );

            if (
                !attemptedHelp &&
                Date.now() > this.nextRequestTime &&
                canReachDeliverySpot(this.beliefs)
            ) {
                // add random between RESQUEST_TIMEOUT_RANGE[0] and RESQUEST_TIMEOUT_RANGE[1], REQUEST_TIMEOUT_RANGE is an array with two numbers representing milliseconds
                const delay =
                    RESQUEST_TIMEOUT_RANGE[0] +
                    Math.random() *
                        (RESQUEST_TIMEOUT_RANGE[1] - RESQUEST_TIMEOUT_RANGE[0]);
                // console.log(`Requesting help in ${delay}ms.`);

                this.nextRequestTime = Date.now() + delay;
                // console.log("next Request Time", this.nextRequestTime);
                sendAvailabilityMessage(this.beliefs, this.api, true);
            }

            const desires = this.desires.generateDesires(this.beliefs);

            for (const desire of desires) {
                // console.log(
                //     "Planning for desire:",
                //     desire.type
                //     // "details:",
                //     // desire.details,
                //     // "possibleParcels:",
                //     // desire.possibleParcels
                // );
                const result = planFor(desire, this.beliefs);
                if (!result) continue;

                console.log("Chosen desire:", desire);

                const { path: plan = [], intention = null } = result;

                if (plan?.length && intention) {
                    return this.startPlanSafely(plan, intention);
                }
            }

            //console.warn("No viable plan found, including fallback.");
        }
    }

    /**
     * Safely initiates a plan and adopts the corresponding intention.
     * @param plan The list of atomic actions to execute.
     * @param intention The intention that the plan fulfills.
     */
    private async startPlanSafely(
        plan: atomicActions[],
        intention: Intention
    ): Promise<void> {
        if (this.planPromise) {
            // console.log("Plan already running, skipping new start.");
            return;
        }

        this.planAbortSignal = false;
        this.intentions.adoptIntention(intention);
        this.currentPlan = plan;

        if (
            intention.type == desireType.DELIVER ||
            intention.type == desireType.PICKUP
        ) {
            if (!this.beliefs.getBelief<boolean>("isCollaborating")) {
                sendAvailabilityMessage(this.beliefs, this.api, false);
            }
        } else if (this.beliefs.getBelief<boolean>("isCollaborating")) {
            sendIntentionUpdateMessage(this.api, this.beliefs, intention.type);
        }
        console.log(
            `Starting plan for intention: ${intention.type}, plan length: ${plan.length}`
        );

        if (intention.type === desireType.PICKUP) {
            const parcelsToPickup = intention.details
                ?.parcelsToPickup as Parcel[];
            if (parcelsToPickup && parcelsToPickup.length > 0) {
                //book parcels
                const teammatesIds =
                    this.beliefs.getBelief<string[]>("teammatesIds") || [];
                for (const teammateId of teammatesIds) {
                    const parcelsIds = parcelsToPickup.map((p) => p.id);
                    this.api.emitSay(
                        teammateId,
                        JSON.stringify({
                            type: "book_parcel",
                            data: {
                                parcelsIds,
                            },
                        })
                    );
                }
            }
        }

        this.planPromise = this.executePlan();
        try {
            await this.planPromise;
        } finally {
            this.planPromise = null;
        }
    }

    /**
     * Executes the current plan using the plan executor. Handles errors and updates beliefs.
     */
    private async executePlan(): Promise<void> {
        const executor = createPlanExecutor({
            api: this.api,
            plan: this.currentPlan,
            actionMap: this.atomicActionToApi,
            isMovingAndBlocked: this.isMovingAndAgentBlocking.bind(this),
            shouldAbort: () => this.planAbortSignal,
            waitTimeMs:
                getConfig("MOVEMENT_DURATION") || WAIT_FOR_AGENT_MOVE_ON,
            maxRetries: MAX_BLOCK_RETRIES,
        });

        const role = this.beliefs.getBelief<string>("role");
        try {
            for await (const step of executor) {
                if (step.action === atomicActions.drop && role === "explorer") {
                    this.lastCollaborationTime = Date.now();
                }
            }
        } catch (err) {
            if (err instanceof Error) {
                console.error("Plan executor failed:", err.message); // just the message, no stack trace
            } else {
                console.error(String(err)); // fallback for non-Error objects
            }

            this.stopCurrentPlan();

            return;
        }
        console.log("Plan execution completed successfully.");
        this.stopCurrentPlan();
    }
    /**
     * Stops the currently running plan and resets the relevant intention and flags.
     */
    private stopCurrentPlan(): void {
        // console.log("Stopping plan.");

        const currentIntention = this.intentions.getCurrentIntention();
        if (currentIntention?.type === desireType.PICKUP) {
            //if dropping current intention pickup clear teammate belief of booked parcels
            const teammatesIds =
                this.beliefs.getBelief<string[]>("teammatesIds") || [];
            for (const teammateId of teammatesIds) {
                this.api.emitSay(
                    teammateId,
                    JSON.stringify({
                        type: "book_parcel",
                        data: {
                            parcelsIds: [],
                        },
                    })
                );
            }
        }
        this.intentions.dropCurrentIntention();
        this.planAbortSignal = true;
    }

    /**
     * Checks if the next move is blocked by another agent.
     * @param action The atomic move action being evaluated.
     * @returns True if an agent is blocking the move, otherwise false.
     */
    private isMovingAndAgentBlocking(action: atomicActions): boolean {
        if (
            action !== atomicActions.moveDown &&
            action !== atomicActions.moveLeft &&
            action !== atomicActions.moveRight &&
            action !== atomicActions.moveUp
        ) {
            return false;
        }
        const current = this.beliefs.getBelief<Position>("position");
        const map = this.beliefs.getBelief<MapConfig>("map");
        if (!current || !map) throw new Error("Missing position or map");

        const delta = {
            [atomicActions.moveDown]: { x: 0, y: 1 },
            [atomicActions.moveLeft]: { x: -1, y: 0 },
            [atomicActions.moveRight]: { x: 1, y: 0 },
            [atomicActions.moveUp]: { x: 0, y: -1 },
        }[action];

        const target = { x: current.x + delta.x, y: current.y + delta.y };
        const agents = this.beliefs.getBelief<Agent[]>("agents") ?? [];
        return agents.some((a) => a.x === target.x && a.y === target.y);
    }
}

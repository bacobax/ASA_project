import Intention from "./Intention.js";

/**
 * Class for Agent,
 * which is responsible for managing the intentions of the agent
 */
export default class Agent {
    private intention_queue: Intention[] = new Array();
    private plans: any[];

    private async intentionLoop(): Promise<void> {
        while (true) {
            const intention = this.intention_queue.shift();
            if (intention) await intention.achieve();
            await new Promise((res) => setImmediate(res));
        }
    }

    constructor(plans: any[]) {
        this.plans = plans;
        this.intentionLoop();
    }

    async queue(desire: string, plans: any[], ...args: any[]): Promise<void> {
        const current = new Intention(desire, plans, ...args);
        this.intention_queue.push(current);
    }

    async stop(): Promise<void> {
        console.log("stop agent queued intentions");
        for (const intention of this.intention_queue) {
            intention.stop();
        }
    }
}

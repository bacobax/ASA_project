import Plan from "./plans/Plan";

/**
 * Intention class that extends Promise to handle async operations
 */
export default class Intention extends Promise<any> {
    #current_plan: Plan | null= null;
    #desire: string;
    #args: any[];
    #resolve: (value: any) => void;
    #reject: (reason?: any) => void;
    #plans: Plan[];
    #started: boolean = false;

    stop(): void {
        console.log('stop intention and current plan');
        if (this.#current_plan) {
            this.#current_plan.stop();
        }
    }

    constructor(desire: string, plans: Plan[], ...args: any[]) {
        let resolve: (value: any) => void;
        let reject: (reason?: any) => void;
        super(async (res, rej) => {
            resolve = res;
            reject = rej;
        });
        this.#resolve = resolve!;
        this.#reject = reject!;
        this.#desire = desire;
        this.#args = args;
        this.#plans = plans;
    }

    async achieve(): Promise<this> {
        if (this.#started)
            return this;
        this.#started = true;

        for (const plan of this.#plans) {
            if (plan.isApplicableTo(this.#desire)) {
                this.#current_plan = plan;
                console.log('achieving desire', this.#desire, ...this.#args,
                    'with plan', plan
                );
                try {
                    const result = await plan.execute(...this.#args);
                    this.#resolve(result);
                    console.log('plan', plan, 'successfully achieved intention',
                        this.#desire, ...this.#args);
                } catch (error) {
                    console.log('plan', plan, 'failed to achieve intention',
                        this.#desire, ...this.#args
                    );
                    this.#reject(error);
                }
            }
        }
        return this;
    }
}
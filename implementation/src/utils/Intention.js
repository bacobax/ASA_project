/**
 * Intention
 */
export default class Intention extends Promise {
    #current_plan;
    stop() {
        console.log("stop intention and current plan");
        this.#current_plan.stop();
    }

    #desire;
    #args;

    #resolve;
    #reject;
    #plans;

    constructor(desire, plans, ...args) {
        var resolve, reject;
        super(async (res, rej) => {
            resolve = res;
            reject = rej;
        });
        this.#resolve = resolve;
        this.#reject = reject;
        this.#desire = desire;
        this.#args = args;
        this.#plans = plans;
    }

    #started = false;
    async achieve() {
        if (this.#started) return this;
        this.#started = true;

        /**
         * Plan selection
         */
        let best_plan;
        let best_plan_score = Number.MIN_VALUE;
        for (const plan of this.plans) {
            if (plan.isApplicableTo(this.#desire)) {
                this.#current_plan = plan;
                console.log(
                    "achieving desire",
                    this.#desire,
                    ...this.#args,
                    "with plan",
                    plan
                );
                try {
                    const result = await plan.execute(...this.#args);
                    this.#resolve(result);
                    console.log(
                        "plan",
                        plan,
                        "succesfully achieved intention",
                        this.#desire,
                        ...this.#args
                    );
                } catch (error) {
                    console.log(
                        "plan",
                        plan,
                        "failed to achieve intention",
                        this.#desire,
                        ...this.#args
                    );
                    this.#reject(e);
                }
            }
        }
    }
}

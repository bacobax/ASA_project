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
    #agent;

    constructor(desire, plans, agent, ...args) {
        console.log(
            "__________________________Intention Constructor__________________________"
        );
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
        this.#agent = agent;

        console.log("plans of intention ", this.#desire, ": ", plans);
        console.log("agent.knowledgeBase", JSON.stringify(agent.knowledgeBase));
    }

    #started = false;
    async achieve() {
        if (this.#started) return this;
        this.#started = true;

        /**
         * Plan selection
         */
        // let best_plan;
        // let best_plan_score = Number.MIN_VALUE;
        console.log(
            "__________________________ACHIEVE INTETION__________________________\n",
            "desire:",
            JSON.stringify(this.#desire),
            "\nplans",
            this.#plans
        );
        for (const plan of this.#plans) {
            console.log("____CHECK PLAN____", plan);
            console.log("____DESIRED____", this.#desire);
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
                    const result = await plan.execute(
                        ...this.#args,
                        this.#agent
                    );
                    this.#resolve(result);
                    console.log(
                        "plan",
                        plan,
                        "succesfully achieved intention",
                        this.#desire,
                        ...this.#args
                    );
                    return;
                } catch (error) {
                    console.log(
                        "plan",
                        plan,
                        "failed to achieve intention",
                        this.#desire,
                        ...this.#args
                    );
                    this.#reject(error);
                    return;
                }
            }
        }

        this.#reject("no plan found for desire " + this.#desire);
        return;
    }
}

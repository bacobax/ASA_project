

import Intention from '../Intention';

interface SubIntentionResult {
    success: boolean;
    result: any;
}

class Plan {
    #sub_intentions: Intention[] = [];

    stop(): void {
        console.log('stop plan and all sub intentions');
        for (const i of this.#sub_intentions) {
            i.stop();
        }
    }

    async subIntention(desire: string, ...args: any[]): Promise<any> {
        const sub_intention = new Intention(desire, ...args);
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

    isApplicableTo(desire: string): boolean {
        return false;
    }

    async execute(...args: any[]): Promise<any> {
        throw new Error('Plan must implement execute method');
    }
}

export default Plan;


export class BeliefBase {
    private beliefs: Map<string, any> = new Map();

    updateBelief<T>(key: string, value: T): void {
        this.beliefs.set(key, value);
    }

    getBelief<T>(key: string): T | undefined {
        return this.beliefs.get(key);
    }

    hasBelief(key: string): boolean {
        return this.beliefs.has(key);
    }

    removeBelief(key: string): void {
        this.beliefs.delete(key);
    }
}
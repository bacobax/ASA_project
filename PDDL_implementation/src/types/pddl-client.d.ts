declare module "@unitn-asa/pddl-client" {
    export interface PddlPredicate {
        name: string;
        parameters: string[];
    }

    export interface PddlObject {
        name: string;
        type?: string;
    }

    export interface PddlLiteral {
        predicate: string;
        args: string[];
        negate?: boolean;
    }

    export interface PddlEffect extends PddlLiteral {
        conditional?: PddlLiteral;
    }

    export interface PddlPlanStep {
        parallel: boolean;
        action: string;
        args: string[];
    }

    export type PddlPlan = PddlPlanStep[];

    export class PddlAction {
        name: string;
        parameters: string;
        precondition: string;
        effect: string;
        executor?: (args: any[]) => Promise<void>;

        constructor(name: string, parameters: string, precondition: string, effect: string, executor?: (args: any[]) => Promise<void>);
        toPddlString(): string;
        static tokenize(string: string): any[];
        static ground(tokenized: any[], parametersMap: Record<string, string>)
        getGroundedTokenizedPrecondition(parameterValueMap: Record<string, string>): any[];
        getGroundedTokenizedEffect(parameterValueMap: Record<string, string>): any[];
    }

    export class PddlDomain {
        static nextId: number;
        name: string;
        predicates: string[];
        actions: PddlAction[];

        constructor(name: string, ...actions: PddlAction[]);
        addPredicate(predicate: string): boolean;
        addAction(...actions: PddlAction[]): void;
        saveToFile(): Promise<string>;
        toPddlString(): string;
    }

    export class PddlProblem {
        static nextId: number;
        name: string;
        objects: string;
        inits: string;
        goals: string;

        constructor(name: string, objects: string, init: string, goal: string);
        saveToFile(): Promise<string>;
        toPddlString(): string;
    }

    export class PddlExecutor {
        actions: Record<string, PddlAction>;

        constructor(...actions: PddlAction[]);
        addAction(...actions: PddlAction[]): void;
        getAction(name: string): PddlAction | undefined;
        exec(plan: PddlPlan): Promise<void>;
    }

    export function onlineSolver(pddlDomain: string, pddlProblem: string): Promise<PddlPlan>;
}
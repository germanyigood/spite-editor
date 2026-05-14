export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

export interface E2EStep {
    name: string;
    action: () => Promise<void>;
}

export interface E2EScenario {
    id: string;
    name: string;
    description: string;
    setup: E2EStep[];
    steps: E2EStep[];
}

export interface E2EResult {
    scenarioId: string;
    setupResults: Record<number, { status: StepStatus; error?: string }>;
    stepResults: Record<number, { status: StepStatus; error?: string }>;
}
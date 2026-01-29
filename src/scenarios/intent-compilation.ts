import { Scenario } from '@/test-harness';

export const intentCompilationScenario: Scenario = {
    id: 'intent-compilation',
    name: 'Intent Compilation Flow',
    description: 'Verifies that typing an intent triggers the compiler and switches to a workspace.',
    calendarEvents: [], // No meetings needed
    expectedMode: 'neutral_intent', // Start in neutral
    steps: [
        {
            id: 'step-1',
            description: 'Start in Neutral Intent mode',
            action: 'Wait for app load',
        },
        {
            id: 'step-2',
            description: 'Type "Help me plan Q3 OKRs"',
            action: 'Manual: Type into input',
        },
        {
            id: 'step-3',
            description: 'Verify "Block Document" workspace appears',
            action: 'Verification',
        },
        {
            id: 'step-4',
            description: 'Return to Neutral, Type "Review Q2 sales data"',
            action: 'Manual: Reset and type',
        },
        {
            id: 'step-5',
            description: 'Verify "Data Grid" workspace appears',
            action: 'Verification',
        }
    ]
};

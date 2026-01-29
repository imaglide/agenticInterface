import { CompiledIntent, WorkspaceDefinition } from './types';

// Mock implementation for Phase H verification
export class MockIntentCompiler {
    async compile(intent: string): Promise<CompiledIntent> {
        const normalized = intent.toLowerCase();

        if (normalized.includes('plan') || normalized.includes('write')) {
            return {
                success: true,
                confidence: 'HIGH',
                workspace: {
                    id: `ws-${Date.now()}`,
                    lens: { type: 'block_doc' },
                    context: {
                        originalIntent: intent,
                        reasoning: 'User wants to plan or write content, best suited for a Block Document.',
                    },
                    initialObjects: [],
                },
            };
        }

        if (normalized.includes('review') || normalized.includes('analyze')) {
            return {
                success: true,
                confidence: 'HIGH',
                workspace: {
                    id: `ws-${Date.now()}`,
                    lens: { type: 'data_grid' },
                    context: {
                        originalIntent: intent,
                        reasoning: 'User wants to review or analyze data, best suited for a Data Grid.',
                    },
                    initialObjects: [],
                },
            };
        }

        // Default fallback
        return {
            success: true,
            confidence: 'LOW',
            workspace: {
                id: `ws-${Date.now()}`,
                lens: { type: 'infinite_canvas' },
                context: {
                    originalIntent: intent,
                    reasoning: 'Ambiguous intent, defaulting to flexible Canvas.',
                },
                initialObjects: [],
            },
        };
    }
}

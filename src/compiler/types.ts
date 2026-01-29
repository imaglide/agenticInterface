export type LensType = 'block_doc' | 'data_grid' | 'infinite_canvas';

export interface LensConfig {
    type: LensType;
    // Dynamic config based on the lens type
    [key: string]: any;
}

export interface WorkspaceObject {
    id: string;
    type: string;
    data: any;
}

export interface WorkspaceDefinition {
    id: string;
    lens: LensConfig;
    context: {
        originalIntent: string;
        reasoning: string;
    };
    initialObjects: WorkspaceObject[];
}

export interface CompiledIntent {
    success: boolean;
    workspace?: WorkspaceDefinition;
    clarificationQuestion?: string;
    confidence: 'HIGH' | 'LOW';
}

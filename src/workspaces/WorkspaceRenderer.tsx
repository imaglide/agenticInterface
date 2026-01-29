'use client';

import { WorkspaceDefinition } from '@/compiler/types';
import { BlockDocWorkspace, DataGridWorkspace, InfiniteCanvasWorkspace } from './components';

interface WorkspaceRendererProps {
    definition: WorkspaceDefinition;
}

export function WorkspaceRenderer({ definition }: WorkspaceRendererProps) {
    const { type } = definition.lens;

    switch (type) {
        case 'block_doc':
            return <BlockDocWorkspace definition={definition} />;
        case 'data_grid':
            return <DataGridWorkspace definition={definition} />;
        case 'infinite_canvas':
            return <InfiniteCanvasWorkspace definition={definition} />;
        default:
            return (
                <div className="p-4 text-red-500">
                    Unknown workspace type: {type}
                </div>
            );
    }
}

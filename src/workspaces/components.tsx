import { WorkspaceDefinition } from '@/compiler/types';

interface WorkspaceProps {
    definition: WorkspaceDefinition;
}

export function BlockDocWorkspace({ definition }: WorkspaceProps) {
    return (
        <div className="h-full w-full rounded-xl bg-white p-8 shadow-sm">
            <div className="mx-auto max-w-3xl">
                <div className="mb-8 border-b pb-4">
                    <h1 className="text-3xl font-bold text-gray-900">Untitled Document</h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Generated from intent: "{definition.context.originalIntent}"
                    </p>
                </div>
                <div className="space-y-4 text-gray-600">
                    <p className="italic text-gray-400">[Block Editor Placeholder]</p>
                    <p>Start typing or use "/" for commands...</p>
                </div>
            </div>
        </div>
    );
}

export function DataGridWorkspace({ definition }: WorkspaceProps) {
    return (
        <div className="h-full w-full rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Data Grid</h1>
                    <p className="text-xs text-gray-500">Context: {definition.context.originalIntent}</p>
                </div>
                <div className="flex gap-2">
                    <button className="rounded bg-blue-50 px-3 py-1 text-xs text-blue-600">Filter</button>
                    <button className="rounded bg-blue-50 px-3 py-1 text-xs text-blue-600">Sort</button>
                </div>
            </div>
            <div className="h-96 w-full rounded border bg-gray-50 p-4 text-center text-gray-400">
                [Data Grid Placeholder]
            </div>
        </div>
    );
}

export function InfiniteCanvasWorkspace({ definition }: WorkspaceProps) {
    return (
        <div className="h-full w-full overflow-hidden rounded-xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-200">
            <div className="absolute left-6 top-6 rounded-lg bg-white/80 p-2 backdrop-blur">
                <h1 className="text-sm font-bold text-gray-900">Canvas</h1>
            </div>
            <div className="flex h-full w-full items-center justify-center">
                <p className="text-gray-400">[Infinite Canvas Placeholder]</p>
            </div>
        </div>
    );
}

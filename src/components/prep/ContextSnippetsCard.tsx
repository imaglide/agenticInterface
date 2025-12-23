'use client';

import { useState } from 'react';

export interface ContextSnippet {
  id: string;
  title: string;
  content: string;
  source?: string;
}

export interface ContextSnippetsCardProps {
  snippets?: ContextSnippet[];
  collapsed?: boolean;
}

export function ContextSnippetsCard({
  snippets = [],
  collapsed: initialCollapsed = true,
}: ContextSnippetsCardProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [expandedSnippetId, setExpandedSnippetId] = useState<string | null>(null);

  if (snippets.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 p-6">
        <h3 className="text-sm font-medium text-gray-400">
          Context
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          No context available for this meeting.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between"
      >
        <h3 className="text-sm font-medium text-gray-500">
          Context ({snippets.length})
        </h3>
        <span className="text-gray-400">
          {collapsed ? '▸' : '▾'}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-4 flex flex-col gap-3">
          {snippets.map((snippet) => (
            <div
              key={snippet.id}
              className="rounded-lg border border-gray-100 bg-gray-50"
            >
              <button
                onClick={() => setExpandedSnippetId(
                  expandedSnippetId === snippet.id ? null : snippet.id
                )}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-700">
                  {snippet.title}
                </span>
                <span className="text-xs text-gray-400">
                  {expandedSnippetId === snippet.id ? '▾' : '▸'}
                </span>
              </button>

              {expandedSnippetId === snippet.id && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm text-gray-600">
                    {snippet.content}
                  </p>
                  {snippet.source && (
                    <p className="mt-2 text-xs text-gray-400">
                      Source: {snippet.source}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

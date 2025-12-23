'use client';

import { Mode } from '@/types/ui-plan';

export interface AdjacentModeSuggestion {
  mode: Mode;
  label: string;
  reason: string;
}

export interface AdjacentModeSuggestionsProps {
  suggestions: AdjacentModeSuggestion[];
  onSelect?: (mode: Mode) => void;
}

const modeIcons: Record<Mode, string> = {
  neutral_intent: '○',
  meeting_prep: '◐',
  meeting_capture: '●',
  meeting_synthesis_min: '◑',
};

export function AdjacentModeSuggestions({
  suggestions,
  onSelect,
}: AdjacentModeSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-gray-100 p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        You might want to
      </p>
      <div className="flex flex-col gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.mode}
            onClick={() => onSelect?.(suggestion.mode)}
            className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-left transition hover:bg-gray-50"
          >
            <span className="text-lg text-gray-400">
              {modeIcons[suggestion.mode]}
            </span>
            <div>
              <p className="font-medium text-gray-900">{suggestion.label}</p>
              <p className="text-sm text-gray-500">{suggestion.reason}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

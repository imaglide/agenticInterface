'use client';

export interface SuggestedIntentsProps {
  intents: string[];
  onSelect?: (intent: string) => void;
}

export function SuggestedIntents({
  intents,
  onSelect,
}: SuggestedIntentsProps) {
  // Limit to max 3 per spec
  const displayIntents = intents.slice(0, 3);

  if (displayIntents.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-gray-500">
        Suggestions
      </h3>
      <div className="flex flex-col gap-2">
        {displayIntents.map((intent, index) => (
          <button
            key={index}
            onClick={() => onSelect?.(intent)}
            className="rounded-lg border border-gray-200 px-4 py-3 text-left text-gray-700 transition hover:border-blue-300 hover:bg-blue-50"
          >
            {intent}
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

export interface PrepPromptsCardProps {
  prompts: string[];
  onPromptAnswer?: (prompt: string, answer: string) => void;
}

export function PrepPromptsCard({
  prompts,
  onPromptAnswer,
}: PrepPromptsCardProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Limit to max 3 per spec
  const displayPrompts = prompts.slice(0, 3);

  if (displayPrompts.length === 0) {
    return null;
  }

  const handleAnswer = (index: number, prompt: string) => {
    const answer = answers[index];
    if (answer?.trim() && onPromptAnswer) {
      onPromptAnswer(prompt, answer.trim());
    }
    setExpandedIndex(null);
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-gray-500">
        Quick Prep
      </h3>

      <div className="flex flex-col gap-2">
        {displayPrompts.map((prompt, index) => (
          <div key={index}>
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                expandedIndex === index
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm text-gray-700">{prompt}</span>
            </button>

            {expandedIndex === index && (
              <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <textarea
                  value={answers[index] || ''}
                  onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
                  placeholder="Your thoughts..."
                  className="w-full resize-none rounded border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={2}
                  autoFocus
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setExpandedIndex(null)}
                    className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleAnswer(index, prompt)}
                    disabled={!answers[index]?.trim()}
                    className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

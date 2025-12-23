'use client';

import { My3Goal } from '@/components/prep/My3GoalsCard';

export interface GoalsChecklistStripProps {
  goals: My3Goal[];
  onGoalToggle?: (id: string, achieved: boolean) => void;
}

export function GoalsChecklistStrip({
  goals,
  onGoalToggle,
}: GoalsChecklistStripProps) {
  if (goals.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-800 bg-gray-900/80 px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center gap-4">
        <span className="text-xs uppercase tracking-wide text-gray-500">
          Goals
        </span>
        <div className="flex flex-1 gap-3">
          {goals.map((goal, index) => (
            <button
              key={goal.id}
              onClick={() => onGoalToggle?.(goal.id, !goal.achieved)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition ${
                goal.achieved
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                goal.achieved
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-600'
              }`}>
                {goal.achieved ? '✓' : index + 1}
              </span>
              <span className={`text-sm ${goal.achieved ? 'line-through opacity-75' : ''}`}>
                {goal.text.length > 30 ? goal.text.slice(0, 30) + '...' : goal.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

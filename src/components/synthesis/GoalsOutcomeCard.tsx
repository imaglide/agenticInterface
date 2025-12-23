'use client';

import { My3Goal } from '@/components/prep/My3GoalsCard';

export interface GoalsOutcomeCardProps {
  goals: My3Goal[];
  onGoalToggle?: (id: string, achieved: boolean) => void;
}

export function GoalsOutcomeCard({
  goals,
  onGoalToggle,
}: GoalsOutcomeCardProps) {
  const achievedCount = goals.filter((g) => g.achieved).length;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">
          Goals Outcome
        </h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          achievedCount === goals.length && goals.length > 0
            ? 'bg-green-100 text-green-700'
            : achievedCount > 0
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {achievedCount}/{goals.length} achieved
        </span>
      </div>

      {goals.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">
          No goals were set for this meeting
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {goals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => onGoalToggle?.(goal.id, !goal.achieved)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                goal.achieved
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                goal.achieved
                  ? 'bg-green-500 text-white'
                  : 'border-2 border-gray-300'
              }`}>
                {goal.achieved && '✓'}
              </span>
              <span className={`flex-1 text-sm ${
                goal.achieved ? 'text-green-800' : 'text-gray-700'
              }`}>
                {goal.text}
              </span>
              {goal.achievedAt && (
                <span className="text-xs text-gray-400">
                  {new Date(goal.achievedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

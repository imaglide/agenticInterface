'use client';

import { useState, useCallback } from 'react';

export interface MeetingGoalCardProps {
  goal: string;
  onGoalChange?: (goal: string) => void;
  readonly?: boolean;
}

export function MeetingGoalCard({
  goal,
  onGoalChange,
  readonly = false,
}: MeetingGoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(goal);

  const handleSave = useCallback(() => {
    if (onGoalChange && editValue !== goal) {
      onGoalChange(editValue);
    }
    setIsEditing(false);
  }, [editValue, goal, onGoalChange]);

  const handleCancel = useCallback(() => {
    setEditValue(goal);
    setIsEditing(false);
  }, [goal]);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-gray-500">
        Meeting Goal
      </h3>

      {isEditing ? (
        <div>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="What should this meeting accomplish?"
            className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            rows={3}
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleSave}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !readonly && setIsEditing(true)}
          className={`min-h-[60px] rounded-lg border-2 border-dashed px-4 py-3 ${
            readonly
              ? 'border-gray-100 bg-gray-50'
              : 'cursor-pointer border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
          }`}
        >
          {goal ? (
            <p className="text-gray-900">{goal}</p>
          ) : (
            <p className="text-gray-400">
              {readonly ? 'No goal set' : 'Click to set a meeting goal...'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

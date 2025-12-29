'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { WorkObjectActionMenu } from '@/components/shared/WorkObjectActionMenu';
import type { LinkType } from '@/storage/work-object-types';

export interface My3Goal {
  id: string;
  text: string;
  achieved: boolean;
  achievedAt?: number;
}

export interface My3GoalsCardProps {
  goals: My3Goal[];
  onGoalAdd?: (text: string) => void;
  onGoalUpdate?: (id: string, text: string) => void;
  onGoalDelete?: (id: string) => void;
  onGoalToggle?: (id: string, achieved: boolean) => void;
  /** Called when user starts linking from a goal */
  onStartLinking?: (goalId: string, linkType: LinkType) => void;
  readonly?: boolean;
}

export function My3GoalsCard({
  goals,
  onGoalAdd,
  onGoalUpdate,
  onGoalDelete,
  onGoalToggle,
  onStartLinking,
  readonly = false,
}: My3GoalsCardProps) {
  const [newGoal, setNewGoal] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const canAddMore = goals.length < 3;

  const handleAdd = useCallback(() => {
    if (newGoal.trim() && onGoalAdd && canAddMore) {
      onGoalAdd(newGoal.trim());
      setNewGoal('');
    }
  }, [newGoal, onGoalAdd, canAddMore]);

  const handleStartEdit = useCallback((goal: My3Goal) => {
    setEditingId(goal.id);
    setEditValue(goal.text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingId && editValue.trim() && onGoalUpdate) {
      onGoalUpdate(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  }, [editingId, editValue, onGoalUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const handleToggle = useCallback((goal: My3Goal) => {
    const newState = !goal.achieved;
    onGoalToggle?.(goal.id, newState);
    toast.success(newState ? 'Goal completed!' : 'Goal reopened');
  }, [onGoalToggle]);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">
          My 3 Goals
        </h3>
        <span className="text-xs text-gray-400">
          {goals.length}/3
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {goals.map((goal, index) => (
          <div
            key={goal.id}
            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
          >
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
              {index + 1}
            </span>

            {editingId === goal.id ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                placeholder="Edit goal..."
                className="flex-1 rounded border-2 border-blue-400 bg-blue-50 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            ) : (
              <span
                className={`flex-1 cursor-text text-sm ${goal.achieved ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                onClick={() => !readonly && handleStartEdit(goal)}
                title={readonly ? undefined : 'Click to edit'}
              >
                {goal.text}
              </span>
            )}

            {!readonly && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(goal)}
                  className={`rounded p-1 transition ${
                    goal.achieved
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={goal.achieved ? 'Mark incomplete' : 'Mark complete'}
                >
                  {goal.achieved ? '✓' : '○'}
                </button>
                <WorkObjectActionMenu
                  onStartLinking={
                    onStartLinking
                      ? (linkType) => onStartLinking(goal.id, linkType)
                      : undefined
                  }
                  onDelete={
                    onGoalDelete
                      ? () => onGoalDelete(goal.id)
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        ))}

        {!readonly && canAddMore && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add a personal goal..."
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              onClick={handleAdd}
              disabled={!newGoal.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}

        {goals.length === 0 && readonly && (
          <p className="py-4 text-center text-sm text-gray-400">
            No goals set
          </p>
        )}
      </div>
    </div>
  );
}

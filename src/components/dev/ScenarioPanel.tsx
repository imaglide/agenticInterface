'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  allScenarios,
  getScenarioById,
  getAllTags,
  type TimelineScenario,
} from '@/test-harness/scenarios';
import type { TestScenario, ScenarioCheckpoint } from '@/test-harness/types';
import {
  activateScenario,
  deactivateScenario,
  getScenarioState,
  getVirtualNow,
  timeControl,
  jumpToCheckpoint,
} from '@/test-harness/scenario-loader';

interface ScenarioPanelProps {
  onScenarioLoaded?: () => void;
}

type ScenarioCategory = 'basic' | 'complex' | 'timeline' | 'edge' | 'stress';

export function ScenarioPanel({ onScenarioLoaded }: ScenarioPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ScenarioCategory>('basic');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadResult, setLoadResult] = useState<{ success: boolean; message: string } | null>(null);

  // Time control state
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState<ScenarioCheckpoint | null>(null);

  // Update current time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getVirtualNow());
      const state = getScenarioState();
      setTimeFrozen(state.timeFrozen);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut: Cmd+Shift+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === 's') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoadScenario = async () => {
    if (!selectedScenario) return;

    setLoading(true);
    setLoadResult(null);

    try {
      const result = await activateScenario(selectedScenario);

      if (result.success) {
        setLoadResult({
          success: true,
          message: `Loaded: ${result.meetingIds.length} meetings, ${result.intentIds.length} intents`,
        });
        onScenarioLoaded?.();
      } else {
        setLoadResult({
          success: false,
          message: result.error || 'Failed to load scenario',
        });
      }
    } catch (error) {
      setLoadResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearScenario = async () => {
    setLoading(true);
    try {
      await deactivateScenario(true);
      setSelectedScenario(null);
      setActiveCheckpoint(null);
      setLoadResult({ success: true, message: 'Scenario cleared' });
      onScenarioLoaded?.();
    } catch (error) {
      setLoadResult({
        success: false,
        message: 'Failed to clear scenario',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeControl = (action: 'freeze' | 'unfreeze' | 'reset' | 'advance') => {
    switch (action) {
      case 'freeze':
        timeControl.freeze();
        setTimeFrozen(true);
        break;
      case 'unfreeze':
        timeControl.unfreeze();
        setTimeFrozen(false);
        break;
      case 'reset':
        timeControl.reset();
        setTimeFrozen(false);
        break;
      case 'advance':
        timeControl.advance(5 * 60 * 1000); // Advance 5 minutes
        break;
    }
    setCurrentTime(getVirtualNow());
  };

  const handleCheckpointSelect = (checkpoint: ScenarioCheckpoint) => {
    if (!selectedScenario || !('checkpoints' in selectedScenario)) return;

    jumpToCheckpoint(selectedScenario as TimelineScenario, checkpoint);
    setActiveCheckpoint(checkpoint);
    setCurrentTime(getVirtualNow());
    setTimeFrozen(true);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getScenarios = (): TestScenario[] => {
    let scenarios: TestScenario[] = allScenarios[selectedCategory] || [];
    if (selectedTag) {
      scenarios = scenarios.filter((s) => s.tags.includes(selectedTag));
    }
    return scenarios;
  };

  const isTimelineScenario = (s: TestScenario): s is TimelineScenario => {
    return 'checkpoints' in s;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-16 z-50 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white shadow-lg hover:bg-indigo-600"
        title="Scenario Panel (Cmd+Shift+S)"
      >
        Scenarios
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-96 overflow-y-auto bg-gray-900 text-gray-100 shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-gray-900 px-4 py-3">
        <h2 className="font-semibold text-indigo-400">Test Scenarios</h2>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Time Display */}
      <div className="border-b border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Virtual Time:</span>
          <span className={`font-mono text-sm ${timeFrozen ? 'text-amber-400' : 'text-green-400'}`}>
            {formatTime(currentTime)}
            {timeFrozen && ' (frozen)'}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Time Controls */}
        <section className="rounded-lg bg-gray-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Time Control
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTimeControl(timeFrozen ? 'unfreeze' : 'freeze')}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                timeFrozen
                  ? 'bg-green-600 hover:bg-green-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              {timeFrozen ? 'Unfreeze' : 'Freeze'}
            </button>
            <button
              onClick={() => handleTimeControl('advance')}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-500"
            >
              +5 min
            </button>
            <button
              onClick={() => handleTimeControl('reset')}
              className="rounded bg-gray-600 px-3 py-1.5 text-xs font-medium hover:bg-gray-500"
            >
              Reset
            </button>
          </div>
        </section>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1 rounded-lg bg-gray-800 p-1">
          {(['basic', 'complex', 'timeline', 'edge', 'stress'] as ScenarioCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedScenario(null);
              }}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium capitalize ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Scenario List */}
        <section className="rounded-lg bg-gray-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Available Scenarios
          </h3>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {getScenarios().map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                className={`w-full rounded px-3 py-2 text-left text-sm ${
                  selectedScenario?.id === scenario.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="font-medium">{scenario.name}</div>
                <div className="mt-0.5 text-xs opacity-70">{scenario.description}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {scenario.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-gray-600 px-1.5 py-0.5 text-xs text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Selected Scenario Details */}
        {selectedScenario && (
          <section className="rounded-lg bg-gray-800 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Scenario Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="font-medium text-indigo-400">{selectedScenario.name}</div>
              <div className="text-gray-400">{selectedScenario.description}</div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Meetings: {selectedScenario.meetings?.length ?? 0}</span>
                <span>Intents: {selectedScenario.intents?.length ?? 0}</span>
                <span>Calendar: {selectedScenario.calendarEvents?.length ?? 0}</span>
              </div>
              {selectedScenario.expectedMode && (
                <div className="text-xs">
                  <span className="text-gray-500">Expected mode: </span>
                  <span className="text-amber-400">{selectedScenario.expectedMode}</span>
                </div>
              )}

              {/* Load/Clear Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleLoadScenario}
                  disabled={loading}
                  className="flex-1 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load Scenario'}
                </button>
                <button
                  onClick={handleClearScenario}
                  disabled={loading}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Timeline Checkpoints */}
        {selectedScenario && isTimelineScenario(selectedScenario) && (
          <section className="rounded-lg bg-gray-800 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Timeline Checkpoints
            </h3>
            <div className="space-y-1">
              {selectedScenario.checkpoints.map((cp) => (
                <button
                  key={cp.id}
                  onClick={() => handleCheckpointSelect(cp)}
                  className={`w-full rounded px-3 py-2 text-left text-sm ${
                    activeCheckpoint?.id === cp.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{cp.name}</span>
                    <span className="text-xs opacity-70">
                      {cp.offsetMinutes >= 0 ? '+' : ''}{cp.offsetMinutes} min
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs opacity-70">{cp.description}</div>
                  {cp.expectedMode && (
                    <div className="mt-1 text-xs text-amber-300">
                      Expected: {cp.expectedMode}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Load Result */}
        {loadResult && (
          <div
            className={`rounded p-3 text-sm ${
              loadResult.success
                ? 'bg-green-900/50 text-green-300'
                : 'bg-red-900/50 text-red-300'
            }`}
          >
            {loadResult.message}
          </div>
        )}

        {/* Instructions */}
        <section className="rounded-lg bg-gray-800/50 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Instructions
          </h3>
          <div className="space-y-1 text-xs text-gray-400">
            <p>1. Select a scenario category (basic, complex, timeline)</p>
            <p>2. Choose a scenario from the list</p>
            <p>3. Click "Load Scenario" to populate data</p>
            <p>4. Use time controls to test different moments</p>
            <p>5. For timeline scenarios, use checkpoints to jump to key moments</p>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Shortcut: <kbd className="rounded bg-gray-700 px-1.5 py-0.5">Cmd+Shift+S</kbd>
          </div>
        </section>
      </div>
    </div>
  );
}

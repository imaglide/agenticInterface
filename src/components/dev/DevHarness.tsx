'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Mode } from '@/types/ui-plan';
import { useEvents, useMeeting, useCompaction, storage } from '@/storage';
import { MeetingState, EventRecord } from '@/storage';

interface DevHarnessProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
  currentMeetingId: string | null;
  onMeetingChange: (meetingId: string | null) => void;
}

const modeOptions: { value: Mode; label: string }[] = [
  { value: 'neutral_intent', label: 'Neutral/Intent' },
  { value: 'meeting_prep', label: 'Meeting Prep' },
  { value: 'meeting_capture', label: 'Meeting Capture' },
  { value: 'meeting_synthesis_min', label: 'Synthesis' },
];

const sampleGoals = [
  'Get alignment on timeline',
  'Understand blockers',
  'Confirm next steps',
];

const markerTypes = ['decision', 'action', 'risk', 'question'] as const;

export function DevHarness({
  currentMode,
  onModeChange,
  currentMeetingId,
  onMeetingChange,
}: DevHarnessProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedMode, setSelectedMode] = useState<Mode>(currentMode);
  const [meetingMinutesAway, setMeetingMinutesAway] = useState(30);
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [markerType, setMarkerType] = useState<typeof markerTypes[number]>('decision');
  const [markerLabel, setMarkerLabel] = useState('');
  const [slowHydration, setSlowHydration] = useState(false);
  const [timeOverrideEnabled, setTimeOverrideEnabled] = useState(false);
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideTime, setOverrideTime] = useState('');

  // Storage hooks - memoize filter to prevent infinite re-renders
  const eventsFilter = useMemo(() => ({ limit: 50 }), []);
  const { events, refresh: refreshEvents } = useEvents(eventsFilter);
  const { meeting, refresh: refreshMeeting } = useMeeting(currentMeetingId);
  const { compact, running: compacting, lastResult } = useCompaction();

  // Keyboard shortcut: Cmd+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync selected mode with current mode
  useEffect(() => {
    setSelectedMode(currentMode);
  }, [currentMode]);

  const handleApplyMode = () => {
    onModeChange(selectedMode);
    storage.logEvent('mode_switched', { from: currentMode, to: selectedMode, source: 'dev_harness' });
  };

  const handleStartSimulation = async () => {
    const now = Date.now();
    const startTime = now + meetingMinutesAway * 60 * 1000;
    const endTime = startTime + meetingDuration * 60 * 1000;

    const meetingId = `sim-${Date.now()}`;
    const newMeeting: MeetingState = {
      id: meetingId,
      title: 'Simulated Meeting',
      startTime,
      endTime,
      attendees: ['You', 'Teammate'],
      goal: '',
      my3Goals: [],
      markers: [],
      markerCounter: 0, // Monotonic counter for marker IDs (m1, m2...)
      synthesisCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await storage.saveMeeting(newMeeting);
    onMeetingChange(meetingId);
    await refreshEvents();
  };

  const handleInjectGoals = async () => {
    if (!currentMeetingId || selectedGoals.length === 0) return;

    for (const goalText of selectedGoals) {
      await storage.addMy3Goal(currentMeetingId, goalText);
    }
    setSelectedGoals([]);
    await refreshMeeting();
    await refreshEvents();
  };

  const handleAddMarker = async () => {
    if (!currentMeetingId) return;

    await storage.addMarker(currentMeetingId, markerType, markerLabel || undefined);
    setMarkerLabel('');
    await refreshMeeting();
    await refreshEvents();
  };

  const handleCompact = async () => {
    await compact();
    await refreshEvents();
  };

  const handleExportEvents = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getMeetingStatus = () => {
    if (!meeting) return 'No meeting';
    const now = Date.now();
    if (now < meeting.startTime - 45 * 60 * 1000) return 'Scheduled';
    if (now < meeting.startTime) return 'Prep';
    if (now < meeting.endTime) return 'Live';
    return 'Ended';
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-4 z-50 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow-lg hover:bg-amber-600"
      >
        Dev ⚙️
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-80 overflow-y-auto bg-gray-900 text-gray-100 shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-gray-900 px-4 py-3">
        <h2 className="font-semibold text-amber-400">Dev Harness</h2>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Durability Warning */}
      <div className="border-b border-amber-600 bg-amber-900/50 px-4 py-2 text-xs text-amber-200">
        ⚠️ Local-only storage (IndexedDB). Clearing site data wipes history.
      </div>

      <div className="space-y-4 p-4">
        {/* Mode Control */}
        <section className="rounded-lg bg-gray-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Force Mode
          </h3>
          <div className="space-y-1">
            {modeOptions.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={selectedMode === opt.value}
                  onChange={() => setSelectedMode(opt.value)}
                  className="accent-amber-500"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          <button
            onClick={handleApplyMode}
            disabled={selectedMode === currentMode}
            className="mt-2 w-full rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            Apply
          </button>
        </section>

        {/* Meeting Simulation */}
        <section className="rounded-lg bg-gray-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Simulate Meeting
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Starts in:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={meetingMinutesAway}
                  onChange={(e) => setMeetingMinutesAway(Number(e.target.value))}
                  className="w-16 rounded bg-gray-700 px-2 py-1 text-right"
                />
                <span className="text-gray-500">min</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Duration:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={meetingDuration}
                  onChange={(e) => setMeetingDuration(Number(e.target.value))}
                  className="w-16 rounded bg-gray-700 px-2 py-1 text-right"
                />
                <span className="text-gray-500">min</span>
              </div>
            </div>
            <button
              onClick={handleStartSimulation}
              className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              Start Simulation
            </button>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Current state:</span>
              <span className="font-medium text-green-400">{getMeetingStatus()}</span>
            </div>
          </div>
        </section>

        {/* Goals Injection */}
        <section className="rounded-lg bg-gray-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Inject Sample Goals
          </h3>
          <div className="space-y-1">
            {sampleGoals.map((goal) => (
              <label key={goal} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedGoals.includes(goal)}
                  onChange={() => toggleGoal(goal)}
                  className="accent-amber-500"
                />
                <span className="text-sm text-gray-300">"{goal}"</span>
              </label>
            ))}
          </div>
          <button
            onClick={handleInjectGoals}
            disabled={!currentMeetingId || selectedGoals.length === 0}
            className="mt-2 w-full rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            Inject Selected
          </button>
        </section>

        {/* Marker Injection */}
        <section className="rounded-lg bg-gray-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Add Test Marker
          </h3>
          <div className="space-y-2">
            <select
              value={markerType}
              onChange={(e) => setMarkerType(e.target.value as typeof markerTypes[number])}
              className="w-full rounded bg-gray-700 px-2 py-1.5 text-sm"
            >
              {markerTypes.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full rounded bg-gray-700 px-2 py-1.5 text-sm"
            />
            <button
              onClick={handleAddMarker}
              disabled={!currentMeetingId}
              className="w-full rounded bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
            >
              Add Marker
            </button>
          </div>
        </section>

        {/* Slow Hydration */}
        <section className="rounded-lg bg-gray-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Slow Hydration Mode
          </h3>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={slowHydration}
              onChange={(e) => setSlowHydration(e.target.checked)}
              className="accent-amber-500"
            />
            <span className="text-sm text-gray-300">Enabled (500ms delay per component)</span>
          </label>
        </section>

        {/* Plan Inspector */}
        <section className="rounded-lg bg-gray-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Current Plan
          </h3>
          <div className="space-y-1 font-mono text-xs">
            <div><span className="text-gray-500">Mode:</span> {currentMode}</div>
            <div><span className="text-gray-500">Meeting:</span> {currentMeetingId || 'none'}</div>
            <div><span className="text-gray-500">Status:</span> {getMeetingStatus()}</div>
            {meeting && (
              <>
                <div><span className="text-gray-500">Goals:</span> {meeting.my3Goals.length}/3</div>
                <div><span className="text-gray-500">Markers:</span> {meeting.markers.length}</div>
              </>
            )}
          </div>
        </section>

        {/* Time Override */}
        <section className="rounded-lg bg-gray-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Override Current Time
          </h3>
          <label className="mb-2 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={timeOverrideEnabled}
              onChange={(e) => setTimeOverrideEnabled(e.target.checked)}
              className="accent-amber-500"
            />
            <span className="text-sm text-gray-300">Enabled</span>
          </label>
          {timeOverrideEnabled && (
            <div className="space-y-2">
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="w-full rounded bg-gray-700 px-2 py-1.5 text-sm"
              />
              <input
                type="time"
                value={overrideTime}
                onChange={(e) => setOverrideTime(e.target.value)}
                className="w-full rounded bg-gray-700 px-2 py-1.5 text-sm"
              />
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Useful for testing prep/capture boundaries
          </p>
        </section>

        {/* Event Log */}
        <section className="rounded-lg bg-gray-800 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Event Log ({events.length})
            </h3>
            <button
              onClick={handleExportEvents}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Export JSON
            </button>
          </div>
          <div className="max-h-48 space-y-0.5 overflow-y-auto font-mono text-xs">
            {events.length === 0 ? (
              <div className="text-gray-500">No events yet</div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex gap-2 text-gray-300">
                  <span className="text-gray-500">{formatTime(event.timestamp)}</span>
                  <span className="text-amber-400">{event.type}</span>
                  {event.payload && Object.keys(event.payload).length > 0 && (
                    <span className="truncate text-gray-500">
                      {JSON.stringify(event.payload).slice(0, 30)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Compaction */}
        <section className="rounded-lg bg-gray-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Storage Maintenance
          </h3>
          <button
            onClick={handleCompact}
            disabled={compacting}
            className="w-full rounded bg-gray-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-500 disabled:opacity-50"
          >
            {compacting ? 'Compacting...' : 'Run Compaction'}
          </button>
          {lastResult && (
            <div className="mt-2 text-xs text-gray-400">
              Last: {lastResult.removed} removed, {lastResult.aggregated} aggregated
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

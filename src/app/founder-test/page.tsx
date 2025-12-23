'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage, useEvents, useMeetings } from '@/storage';
import { EventRecord, MeetingState } from '@/storage/types';
import { Mode } from '@/types/ui-plan';

// ============================================
// Metric Types
// ============================================

interface CorrectMetrics {
  // Core rates (all computed from events, not UI state)
  overrideRate: number; // manual_mode_switch / plan_render
  capsuleOpenRate: number; // capsule_opened / plan_rendered
  goalUtilization: number; // meetings with ≥1 goal / meetings opened in prep
  markerUtilization: number; // meetings with ≥1 marker / meetings opened in capture
  synthesisCompletion: number; // synthesis completed / meetings ended

  // Bounce rates per mode
  bounceRates: Record<string, number>;
  overallBounceRate: number;

  // Raw counts for transparency
  counts: {
    planRenders: number;
    manualOverrides: number;
    capsuleOpens: number;
    sessionsOpened: number;
    sessionsBounced: number;
    meetingsInPrep: number;
    meetingsWithGoals: number;
    meetingsInCapture: number;
    meetingsWithMarkers: number;
    meetingsEnded: number;
    meetingsSynthesisCompleted: number;
  };

  // Override reasons (for actionable report)
  overrideReasons: Array<{ reason: string; count: number }>;

  // Days covered
  daysCovered: number;
}

// ============================================
// Metric Computation (from events only)
// ============================================

function computeCorrectMetrics(
  events: EventRecord[],
  meetings: MeetingState[]
): CorrectMetrics {
  // Plan renders
  const planRenders = events.filter((e) => e.type === 'plan_rendered');

  // Manual overrides: mode_switched with explicit_user_action trigger
  const manualOverrides = events.filter(
    (e) =>
      e.type === 'mode_switched' &&
      (e.payload.trigger === 'explicit_user_action' || e.payload.source === 'dev_harness')
  );

  // Capsule opens
  const capsuleOpens = events.filter((e) => e.type === 'capsule_opened');

  // Session tracking
  const sessionsOpened = events.filter((e) => e.type === 'session_opened');
  const sessionsBounced = events.filter((e) => e.type === 'session_bounced');

  // Bounce rates by mode
  const bounceRates: Record<string, number> = {};
  const sessionsByMode: Record<string, { opened: number; bounced: number }> = {};

  for (const event of sessionsOpened) {
    const mode = (event.payload.mode as string) || 'unknown';
    if (!sessionsByMode[mode]) {
      sessionsByMode[mode] = { opened: 0, bounced: 0 };
    }
    sessionsByMode[mode].opened++;
  }

  for (const event of sessionsBounced) {
    const mode = (event.payload.mode as string) || 'unknown';
    if (!sessionsByMode[mode]) {
      sessionsByMode[mode] = { opened: 0, bounced: 0 };
    }
    sessionsByMode[mode].bounced++;
  }

  for (const [mode, data] of Object.entries(sessionsByMode)) {
    bounceRates[mode] = data.opened > 0 ? (data.bounced / data.opened) * 100 : 0;
  }

  // Meeting lifecycle events
  const prepOpened = events.filter((e) => e.type === 'meeting_prep_opened');
  const captureOpened = events.filter((e) => e.type === 'meeting_capture_opened');
  const synthesisOpened = events.filter((e) => e.type === 'meeting_synthesis_opened');
  const synthesisCompleted = events.filter((e) => e.type === 'synthesis_completed');

  // Get unique meeting IDs from prep events
  const meetingsInPrep = new Set(prepOpened.map((e) => e.payload.meetingId as string));
  const meetingsInCapture = new Set(captureOpened.map((e) => e.payload.meetingId as string));
  const meetingsWithSynthesisOpened = new Set(synthesisOpened.map((e) => e.payload.meetingId as string));
  const meetingsWithSynthesisCompleted = new Set(synthesisCompleted.map((e) => e.payload.meetingId as string));

  // Meetings with goals (from storage)
  const meetingsWithGoals = meetings.filter((m) => m.my3Goals.length >= 1);
  const meetingsWithMarkers = meetings.filter((m) => m.markers.length >= 1);

  // Cross-reference: meetings that were in prep AND have goals
  const prepMeetingIds = Array.from(meetingsInPrep);
  const meetingsInPrepWithGoals = prepMeetingIds.filter((id) =>
    meetingsWithGoals.some((m) => m.id === id)
  );

  // Cross-reference: meetings that were in capture AND have markers
  const captureMeetingIds = Array.from(meetingsInCapture);
  const meetingsInCaptureWithMarkers = captureMeetingIds.filter((id) =>
    meetingsWithMarkers.some((m) => m.id === id)
  );

  // Meetings that ended (endTime in past)
  const now = Date.now();
  const meetingsEnded = meetings.filter((m) => m.endTime < now);

  // Override reasons aggregation
  const reasonCounts: Record<string, number> = {};
  for (const event of manualOverrides) {
    const reason = (event.payload.reason as string) || 'No reason given';
    const from = (event.payload.from as string) || 'unknown';
    const to = (event.payload.to as string) || 'unknown';
    const key = `${from} → ${to}: ${reason}`;
    reasonCounts[key] = (reasonCounts[key] || 0) + 1;
  }
  const overrideReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Days covered
  const dates = new Set(
    events.map((e) => new Date(e.timestamp).toISOString().split('T')[0])
  );

  // Compute rates (avoid division by zero)
  const overrideRate = planRenders.length > 0
    ? (manualOverrides.length / planRenders.length) * 100
    : 0;

  const capsuleOpenRate = planRenders.length > 0
    ? (capsuleOpens.length / planRenders.length) * 100
    : 0;

  const goalUtilization = meetingsInPrep.size > 0
    ? (meetingsInPrepWithGoals.length / meetingsInPrep.size) * 100
    : 0;

  const markerUtilization = meetingsInCapture.size > 0
    ? (meetingsInCaptureWithMarkers.length / meetingsInCapture.size) * 100
    : 0;

  const synthesisCompletion = meetingsEnded.length > 0
    ? (meetingsWithSynthesisCompleted.size / meetingsEnded.length) * 100
    : 0;

  const overallBounceRate = sessionsOpened.length > 0
    ? (sessionsBounced.length / sessionsOpened.length) * 100
    : 0;

  return {
    overrideRate,
    capsuleOpenRate,
    goalUtilization,
    markerUtilization,
    synthesisCompletion,
    bounceRates,
    overallBounceRate,
    counts: {
      planRenders: planRenders.length,
      manualOverrides: manualOverrides.length,
      capsuleOpens: capsuleOpens.length,
      sessionsOpened: sessionsOpened.length,
      sessionsBounced: sessionsBounced.length,
      meetingsInPrep: meetingsInPrep.size,
      meetingsWithGoals: meetingsInPrepWithGoals.length,
      meetingsInCapture: meetingsInCapture.size,
      meetingsWithMarkers: meetingsInCaptureWithMarkers.length,
      meetingsEnded: meetingsEnded.length,
      meetingsSynthesisCompleted: meetingsWithSynthesisCompleted.size,
    },
    overrideReasons,
    daysCovered: dates.size,
  };
}

// ============================================
// Override Log
// ============================================

interface OverrideEntry {
  date: string;
  time: string;
  from: string;
  to: string;
  reason: string;
}

function getOverrideLog(events: EventRecord[]): OverrideEntry[] {
  return events
    .filter(
      (e) =>
        e.type === 'mode_switched' &&
        (e.payload.trigger === 'explicit_user_action' || e.payload.source === 'dev_harness')
    )
    .map((e) => ({
      date: new Date(e.timestamp).toLocaleDateString(),
      time: new Date(e.timestamp).toLocaleTimeString(),
      from: (e.payload.from as string) || 'unknown',
      to: (e.payload.to as string) || 'unknown',
      reason: (e.payload.reason as string) || 'Manual override',
    }))
    .reverse();
}

// ============================================
// Friction Log Entry
// ============================================

interface FrictionEntry {
  date: string;
  mode: string;
  issue: string;
}

// ============================================
// Dashboard Component
// ============================================

export default function FounderTestDashboard() {
  const { events, refresh } = useEvents();
  const { meetings } = useMeetings();
  const [metrics, setMetrics] = useState<CorrectMetrics | null>(null);
  const [overrideLog, setOverrideLog] = useState<OverrideEntry[]>([]);

  // Journal state
  const [journalEntries, setJournalEntries] = useState<Record<string, string>>({});
  const [todayJournal, setTodayJournal] = useState({
    whatWorked: '',
    whatFeltWrong: '',
    systemChoseCorrectly: '',
    wishDifferent: '',
    preferOldSystem: '',
    firstScreenCorrect: '', // New: Y/N
  });

  // Friction log
  const [frictionEntries, setFrictionEntries] = useState<FrictionEntry[]>([]);
  const [newFriction, setNewFriction] = useState({ mode: '', issue: '' });

  useEffect(() => {
    if (events.length > 0) {
      setMetrics(computeCorrectMetrics(events, meetings));
      setOverrideLog(getOverrideLog(events));
    }
  }, [events, meetings]);

  const addFrictionEntry = () => {
    if (newFriction.mode && newFriction.issue) {
      setFrictionEntries([
        ...frictionEntries,
        {
          date: new Date().toLocaleDateString(),
          mode: newFriction.mode,
          issue: newFriction.issue,
        },
      ]);
      setNewFriction({ mode: '', issue: '' });
    }
  };

  // Export functions
  const exportData = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      metrics,
      overrideLog,
      frictionEntries,
      journalEntries: { ...journalEntries, [new Date().toLocaleDateString()]: todayJournal },
      events: events.slice(0, 2000),
      meetings,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `founder-test-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, overrideLog, frictionEntries, journalEntries, todayJournal, events, meetings]);

  const exportMarkdown = useCallback(() => {
    if (!metrics) return;

    const date = new Date().toISOString().split('T')[0];
    const md = `# Founder Test Report - ${date}

## Test Duration
- **Days covered:** ${metrics.daysCovered}
- **Sessions opened:** ${metrics.counts.sessionsOpened}
- **Plan renders:** ${metrics.counts.planRenders}

---

## Key Metrics (Computed from Events)

### Override Rate
- **Rate:** ${metrics.overrideRate.toFixed(1)}%
- **Formula:** manual_mode_switches / plan_renders
- **Raw:** ${metrics.counts.manualOverrides} / ${metrics.counts.planRenders}
- **Threshold:** < 30% ${metrics.overrideRate > 30 ? '⚠️ EXCEEDS' : '✓ OK'}

### Capsule Open Rate
- **Rate:** ${metrics.capsuleOpenRate.toFixed(1)}%
- **Formula:** capsule_opened / plan_rendered
- **Raw:** ${metrics.counts.capsuleOpens} / ${metrics.counts.planRenders}
- **Note:** High early is fine; trending down is the goal

### Goal Utilization (Prep)
- **Rate:** ${metrics.goalUtilization.toFixed(1)}%
- **Formula:** meetings with ≥1 goal / meetings opened in prep
- **Raw:** ${metrics.counts.meetingsWithGoals} / ${metrics.counts.meetingsInPrep}

### Marker Utilization (Capture)
- **Rate:** ${metrics.markerUtilization.toFixed(1)}%
- **Formula:** meetings with ≥1 marker / meetings opened in capture
- **Raw:** ${metrics.counts.meetingsWithMarkers} / ${metrics.counts.meetingsInCapture}

### Synthesis Completion
- **Rate:** ${metrics.synthesisCompletion.toFixed(1)}%
- **Formula:** synthesis completed / meetings ended
- **Raw:** ${metrics.counts.meetingsSynthesisCompleted} / ${metrics.counts.meetingsEnded}

### Bounce Rate
- **Overall:** ${metrics.overallBounceRate.toFixed(1)}%
- **Formula:** sessions bounced (no interaction in 20s) / sessions opened
- **By Mode:**
${Object.entries(metrics.bounceRates)
  .map(([mode, rate]) => `  - ${mode}: ${rate.toFixed(1)}%`)
  .join('\n')}

---

## Top Override Reasons

${metrics.overrideReasons.length > 0
  ? metrics.overrideReasons.map((r, i) => `${i + 1}. **${r.reason}** (${r.count}x)`).join('\n')
  : '_No overrides recorded_'}

---

## Modes with Highest Bounce

${Object.entries(metrics.bounceRates)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 3)
  .map(([mode, rate]) => `- **${mode}:** ${rate.toFixed(1)}% bounce rate`)
  .join('\n') || '_No bounce data_'}

---

## Override Log

| Date | Time | From | To | Reason |
|------|------|------|-------|--------|
${overrideLog.slice(0, 20).map((o) => `| ${o.date} | ${o.time} | ${o.from} | ${o.to} | ${o.reason} |`).join('\n') || '| - | - | - | - | No overrides |'}

---

## Friction Log

| Date | Mode | Issue |
|------|------|-------|
${frictionEntries.map((f) => `| ${f.date} | ${f.mode} | ${f.issue} |`).join('\n') || '| - | - | No friction recorded |'}

---

## Success Criteria Checklist (§16)

- [ ] You prefer opening this over your current system
- [ ] You trust the first screen
- [ ] You don't look for menus
- [ ] Prep, capture, and synthesis feel calm
- [ ] You feel "closed" after meetings

---

## Failure Signals

- Override rate: ${metrics.overrideRate > 30 ? '⚠️ EXCEEDS 30%' : '✓ Under 30%'}
- Bounce in prep: ${(metrics.bounceRates['meeting_prep'] || 0) > 20 ? '⚠️ HIGH' : '✓ OK'}
- Bounce in capture: ${(metrics.bounceRates['meeting_capture'] || 0) > 20 ? '⚠️ HIGH' : '✓ OK'}

---

## Next Changes (from Friction Log)

${frictionEntries.slice(0, 5).map((f) => `- [ ] Fix: ${f.issue} (${f.mode})`).join('\n') || '_Add friction entries to populate this section_'}

---

## Go/No-Go Recommendation

_Fill in after reviewing all data_

`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `founder-test-report-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, overrideLog, frictionEntries]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Founder Test Dashboard</h1>
          <p className="text-gray-600">
            Metrics computed from events only — no UI state guessing
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={refresh}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Refresh Data
          </button>
          <button
            onClick={exportData}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Export JSON
          </button>
          <button
            onClick={exportMarkdown}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Generate Report
          </button>
          <a
            href="/"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Back to App
          </a>
        </div>

        {/* Core Metrics */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Core Metrics</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Override Rate"
              value={`${(metrics?.overrideRate || 0).toFixed(1)}%`}
              formula="manual_switches / plan_renders"
              raw={`${metrics?.counts.manualOverrides || 0} / ${metrics?.counts.planRenders || 0}`}
              threshold="< 30%"
              warning={(metrics?.overrideRate || 0) > 30}
            />
            <MetricCard
              label="Capsule Open Rate"
              value={`${(metrics?.capsuleOpenRate || 0).toFixed(1)}%`}
              formula="capsule_opened / plan_rendered"
              raw={`${metrics?.counts.capsuleOpens || 0} / ${metrics?.counts.planRenders || 0}`}
              note="High early OK, trend down"
            />
            <MetricCard
              label="Overall Bounce Rate"
              value={`${(metrics?.overallBounceRate || 0).toFixed(1)}%`}
              formula="bounced / sessions"
              raw={`${metrics?.counts.sessionsBounced || 0} / ${metrics?.counts.sessionsOpened || 0}`}
              threshold="< 20%"
              warning={(metrics?.overallBounceRate || 0) > 20}
            />
          </div>
        </div>

        {/* Utilization Metrics */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Utilization Metrics</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Goal Utilization (Prep)"
              value={`${(metrics?.goalUtilization || 0).toFixed(1)}%`}
              formula="meetings w/ ≥1 goal / prep opens"
              raw={`${metrics?.counts.meetingsWithGoals || 0} / ${metrics?.counts.meetingsInPrep || 0}`}
              note="Should be high"
            />
            <MetricCard
              label="Marker Utilization (Capture)"
              value={`${(metrics?.markerUtilization || 0).toFixed(1)}%`}
              formula="meetings w/ ≥1 marker / capture opens"
              raw={`${metrics?.counts.meetingsWithMarkers || 0} / ${metrics?.counts.meetingsInCapture || 0}`}
              note="Should be high"
            />
            <MetricCard
              label="Synthesis Completion"
              value={`${(metrics?.synthesisCompletion || 0).toFixed(1)}%`}
              formula="synthesis done / meetings ended"
              raw={`${metrics?.counts.meetingsSynthesisCompleted || 0} / ${metrics?.counts.meetingsEnded || 0}`}
              note="Measures closure"
            />
          </div>
        </div>

        {/* Bounce Rate by Mode */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Bounce Rate by Mode</h2>
          <p className="mb-4 text-sm text-gray-500">
            Bounce = left within 20s without interaction. Prep/Capture should be low.
          </p>
          <div className="space-y-2">
            {Object.entries(metrics?.bounceRates || {}).map(([mode, rate]) => (
              <div key={mode} className="flex items-center gap-4">
                <span className="w-40 text-sm text-gray-600">{mode}</span>
                <div className="flex-1">
                  <div
                    className={`h-6 rounded ${rate > 20 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(rate, 100)}%` }}
                  />
                </div>
                <span className={`w-16 text-right text-sm ${rate > 20 ? 'text-red-600' : 'text-gray-500'}`}>
                  {rate.toFixed(1)}%
                </span>
              </div>
            ))}
            {Object.keys(metrics?.bounceRates || {}).length === 0 && (
              <p className="text-gray-400">No session data yet</p>
            )}
          </div>
        </div>

        {/* Top Override Reasons */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Override Reasons</h2>
          {metrics?.overrideReasons.length === 0 ? (
            <p className="text-gray-400">No overrides recorded yet</p>
          ) : (
            <div className="space-y-2">
              {metrics?.overrideReasons.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2">
                  <span className="text-sm text-gray-700">{r.reason}</span>
                  <span className="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-600">
                    {r.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Override Log */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Override Log ({overrideLog.length})
          </h2>
          {overrideLog.length === 0 ? (
            <p className="text-gray-400">No manual overrides recorded</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">From</th>
                    <th className="px-3 py-2 text-left">To</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {overrideLog.map((entry, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{entry.date}</td>
                      <td className="px-3 py-2">{entry.time}</td>
                      <td className="px-3 py-2">{entry.from}</td>
                      <td className="px-3 py-2">{entry.to}</td>
                      <td className="px-3 py-2 text-gray-500">{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Daily Journal */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Daily Journal</h2>

          {/* First Screen Correct - prominent */}
          <div className="mb-4 rounded-lg bg-amber-50 p-4">
            <label className="mb-2 block font-medium text-amber-800">
              Was the first screen correct? (Critical signal)
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="firstScreen"
                  value="Y"
                  checked={todayJournal.firstScreenCorrect === 'Y'}
                  onChange={(e) => setTodayJournal({ ...todayJournal, firstScreenCorrect: e.target.value })}
                  className="accent-green-600"
                />
                <span className="text-green-700">Yes</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="firstScreen"
                  value="N"
                  checked={todayJournal.firstScreenCorrect === 'N'}
                  onChange={(e) => setTodayJournal({ ...todayJournal, firstScreenCorrect: e.target.value })}
                  className="accent-red-600"
                />
                <span className="text-red-700">No</span>
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">1. What worked well today?</label>
              <textarea
                value={todayJournal.whatWorked}
                onChange={(e) => setTodayJournal({ ...todayJournal, whatWorked: e.target.value })}
                className="h-20 w-full rounded-lg border p-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">2. What felt wrong or awkward?</label>
              <textarea
                value={todayJournal.whatFeltWrong}
                onChange={(e) => setTodayJournal({ ...todayJournal, whatFeltWrong: e.target.value })}
                className="h-20 w-full rounded-lg border p-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">3. Did the system choose correctly?</label>
              <textarea
                value={todayJournal.systemChoseCorrectly}
                onChange={(e) => setTodayJournal({ ...todayJournal, systemChoseCorrectly: e.target.value })}
                className="h-20 w-full rounded-lg border p-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">4. What did you wish it did differently?</label>
              <textarea
                value={todayJournal.wishDifferent}
                onChange={(e) => setTodayJournal({ ...todayJournal, wishDifferent: e.target.value })}
                className="h-20 w-full rounded-lg border p-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-gray-600">5. Would you have preferred your old system today?</label>
              <textarea
                value={todayJournal.preferOldSystem}
                onChange={(e) => setTodayJournal({ ...todayJournal, preferOldSystem: e.target.value })}
                className="h-20 w-full rounded-lg border p-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Friction Log */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Friction Log</h2>
          <p className="mb-4 text-sm text-gray-500">Record moments of frustration or confusion</p>

          <div className="mb-4 flex gap-2">
            <select
              value={newFriction.mode}
              onChange={(e) => setNewFriction({ ...newFriction, mode: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Select mode</option>
              <option value="neutral_intent">Neutral</option>
              <option value="meeting_prep">Prep</option>
              <option value="meeting_capture">Capture</option>
              <option value="meeting_synthesis_min">Synthesis</option>
            </select>
            <input
              type="text"
              value={newFriction.issue}
              onChange={(e) => setNewFriction({ ...newFriction, issue: e.target.value })}
              placeholder="Describe the issue..."
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <button
              onClick={addFrictionEntry}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Add
            </button>
          </div>

          {frictionEntries.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Mode</th>
                  <th className="px-3 py-2 text-left">Issue</th>
                </tr>
              </thead>
              <tbody>
                {frictionEntries.map((entry, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{entry.date}</td>
                    <td className="px-3 py-2">{entry.mode}</td>
                    <td className="px-3 py-2">{entry.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Success Criteria */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Success Criteria (§16)</h2>
          <div className="space-y-3">
            <ChecklistItem label="You prefer opening this over your current system" />
            <ChecklistItem label="You trust the first screen" />
            <ChecklistItem label="You don't look for menus" />
            <ChecklistItem label="Prep, capture, and synthesis feel calm" />
            <ChecklistItem label="You feel 'closed' after meetings" />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            If all five are true, the product is not fragile.
          </p>
        </div>

        {/* Test Protocol Reminder */}
        <div className="mb-8 rounded-xl border-2 border-amber-300 bg-amber-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-amber-800">Test Protocol (Locked)</h2>
          <p className="mb-4 text-sm text-amber-700">
            For the next 5 workdays, open the tool every time you:
          </p>
          <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-amber-700">
            <li>Are within the prep window (T-45min)</li>
            <li>Are in a meeting you care about</li>
            <li>Finish a meeting</li>
          </ul>
          <p className="text-sm font-medium text-amber-800">
            No exceptions. Consistency matters more than "perfect days."
          </p>
        </div>

        {/* Days Counter */}
        <div className="text-center text-gray-500">
          <p>Days covered: {metrics?.daysCovered || 0} / 5 minimum</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function MetricCard({
  label,
  value,
  formula,
  raw,
  threshold,
  note,
  warning,
}: {
  label: string;
  value: string;
  formula: string;
  raw: string;
  threshold?: string;
  note?: string;
  warning?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${warning ? 'border-red-500 bg-red-50' : 'bg-gray-50'}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${warning ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      <p className="mt-1 font-mono text-xs text-gray-400">{formula}</p>
      <p className="font-mono text-xs text-gray-400">= {raw}</p>
      {threshold && (
        <p className={`mt-1 text-xs ${warning ? 'text-red-600' : 'text-green-600'}`}>
          Threshold: {threshold}
        </p>
      )}
      {note && <p className="mt-1 text-xs text-gray-400">{note}</p>}
    </div>
  );
}

function ChecklistItem({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="h-5 w-5 rounded accent-green-600"
      />
      <span className={checked ? 'text-green-700' : 'text-gray-700'}>{label}</span>
    </label>
  );
}

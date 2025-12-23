/**
 * Metric Computation Utilities
 *
 * Pure functions for computing founder test metrics from events.
 * Extracted for testability.
 */

import { EventRecord, MeetingState } from '@/storage/types';

// ============================================
// Types
// ============================================

export interface MetricCounts {
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
}

export interface ComputedMetrics {
  overrideRate: number;
  capsuleOpenRate: number;
  goalUtilization: number;
  markerUtilization: number;
  synthesisCompletion: number;
  bounceRates: Record<string, number>;
  overallBounceRate: number;
  counts: MetricCounts;
  overrideReasons: Array<{ reason: string; count: number }>;
  daysCovered: number;
}

// ============================================
// Core Computation
// ============================================

/**
 * Compute all metrics from events and meetings.
 *
 * Key formulas:
 * - Override rate = manual_mode_switch / plan_render
 * - Capsule open rate = capsule_opened / plan_rendered
 * - Goal utilization = meetings with ≥1 goal / meetings opened in prep
 * - Marker utilization = meetings with ≥1 marker / meetings opened in capture
 * - Synthesis completion = synthesis completed / meetings ended
 * - Bounce rate = sessions bounced / sessions opened
 */
export function computeMetrics(
  events: EventRecord[],
  meetings: MeetingState[],
  now: number = Date.now()
): ComputedMetrics {
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
  const bounceRates = computeBounceRates(sessionsOpened, sessionsBounced);

  // Meeting lifecycle events
  const prepOpened = events.filter((e) => e.type === 'meeting_prep_opened');
  const captureOpened = events.filter((e) => e.type === 'meeting_capture_opened');
  const synthesisCompleted = events.filter((e) => e.type === 'synthesis_completed');

  // Unique meeting IDs from events
  const meetingsInPrep = new Set(prepOpened.map((e) => e.payload.meetingId as string));
  const meetingsInCapture = new Set(captureOpened.map((e) => e.payload.meetingId as string));
  const meetingsWithSynthesisCompleted = new Set(
    synthesisCompleted.map((e) => e.payload.meetingId as string)
  );

  // Meetings from storage with features
  const meetingsWithGoals = meetings.filter((m) => m.my3Goals.length >= 1);
  const meetingsWithMarkers = meetings.filter((m) => m.markers.length >= 1);

  // Cross-reference: prep meetings with goals
  const prepMeetingIds = Array.from(meetingsInPrep);
  const meetingsInPrepWithGoals = prepMeetingIds.filter((id) =>
    meetingsWithGoals.some((m) => m.id === id)
  );

  // Cross-reference: capture meetings with markers
  const captureMeetingIds = Array.from(meetingsInCapture);
  const meetingsInCaptureWithMarkers = captureMeetingIds.filter((id) =>
    meetingsWithMarkers.some((m) => m.id === id)
  );

  // Meetings that have ended
  const meetingsEnded = meetings.filter((m) => m.endTime < now);

  // Override reasons aggregation
  const overrideReasons = aggregateOverrideReasons(manualOverrides);

  // Days covered
  const dates = new Set(
    events.map((e) => new Date(e.timestamp).toISOString().split('T')[0])
  );

  // Compute rates
  const counts: MetricCounts = {
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
  };

  return {
    overrideRate: safePercent(counts.manualOverrides, counts.planRenders),
    capsuleOpenRate: safePercent(counts.capsuleOpens, counts.planRenders),
    goalUtilization: safePercent(counts.meetingsWithGoals, counts.meetingsInPrep),
    markerUtilization: safePercent(counts.meetingsWithMarkers, counts.meetingsInCapture),
    synthesisCompletion: safePercent(counts.meetingsSynthesisCompleted, counts.meetingsEnded),
    bounceRates,
    overallBounceRate: safePercent(counts.sessionsBounced, counts.sessionsOpened),
    counts,
    overrideReasons,
    daysCovered: dates.size,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Compute bounce rates per mode.
 */
export function computeBounceRates(
  sessionsOpened: EventRecord[],
  sessionsBounced: EventRecord[]
): Record<string, number> {
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

  const bounceRates: Record<string, number> = {};
  for (const [mode, data] of Object.entries(sessionsByMode)) {
    bounceRates[mode] = safePercent(data.bounced, data.opened);
  }

  return bounceRates;
}

/**
 * Aggregate override reasons by frequency.
 */
export function aggregateOverrideReasons(
  overrides: EventRecord[]
): Array<{ reason: string; count: number }> {
  const reasonCounts: Record<string, number> = {};

  for (const event of overrides) {
    const reason = (event.payload.reason as string) || 'No reason given';
    const from = (event.payload.from as string) || 'unknown';
    const to = (event.payload.to as string) || 'unknown';
    const key = `${from} → ${to}: ${reason}`;
    reasonCounts[key] = (reasonCounts[key] || 0) + 1;
  }

  return Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Calculate percentage avoiding division by zero.
 */
export function safePercent(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

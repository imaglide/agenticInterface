/**
 * Metrics Computation Tests
 *
 * Tests the founder test metric calculations.
 * Verifies correct denominators and cross-referencing.
 */

import { describe, it, expect } from 'vitest';
import {
  computeMetrics,
  computeBounceRates,
  aggregateOverrideReasons,
  safePercent,
} from '../metrics';
import { EventRecord, MeetingState } from '@/storage/types';

// ============================================
// Test Helpers
// ============================================

function createEvent(
  type: EventRecord['type'],
  payload: Record<string, unknown> = {},
  timestampOffset: number = 0
): EventRecord {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    timestamp: Date.now() + timestampOffset,
    payload,
  };
}

function createMeeting(
  id: string,
  options: {
    goals?: number;
    markers?: number;
    endTime?: number;
    synthesisCompleted?: boolean;
  } = {}
): MeetingState {
  const now = Date.now();
  return {
    id,
    title: `Meeting ${id}`,
    startTime: now - 60 * 60 * 1000,
    endTime: options.endTime ?? now - 30 * 60 * 1000,
    attendees: [],
    my3Goals: Array(options.goals || 0)
      .fill(null)
      .map((_, i) => ({
        id: `goal-${i}`,
        text: `Goal ${i}`,
        achieved: false,
      })),
    markers: Array(options.markers || 0)
      .fill(null)
      .map((_, i) => ({
        id: `marker-${i}`,
        type: 'decision' as const,
        timestamp: now,
        meetingId: id,
      })),
    synthesisCompleted: options.synthesisCompleted || false,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================
// safePercent Tests
// ============================================

describe('safePercent', () => {
  it('calculates correct percentage', () => {
    expect(safePercent(25, 100)).toBe(25);
    expect(safePercent(1, 4)).toBe(25);
    expect(safePercent(3, 10)).toBe(30);
  });

  it('returns 0 when denominator is 0', () => {
    expect(safePercent(5, 0)).toBe(0);
    expect(safePercent(0, 0)).toBe(0);
  });

  it('handles 100% correctly', () => {
    expect(safePercent(10, 10)).toBe(100);
  });

  it('handles > 100% correctly', () => {
    expect(safePercent(150, 100)).toBe(150);
  });
});

// ============================================
// Override Rate Tests
// ============================================

describe('Override Rate', () => {
  it('calculates override rate = manual_switches / plan_renders', () => {
    const events: EventRecord[] = [
      // 10 plan renders
      ...Array(10).fill(null).map(() => createEvent('plan_rendered')),
      // 3 manual overrides
      createEvent('mode_switched', { trigger: 'explicit_user_action', from: 'neutral', to: 'prep' }),
      createEvent('mode_switched', { trigger: 'explicit_user_action', from: 'prep', to: 'capture' }),
      createEvent('mode_switched', { trigger: 'explicit_user_action', from: 'capture', to: 'synthesis' }),
      // 2 auto switches (should NOT count)
      createEvent('mode_switched', { trigger: 'meeting_boundary_change', from: 'neutral', to: 'prep' }),
      createEvent('mode_switched', { trigger: 'app_open', from: 'neutral', to: 'prep' }),
    ];

    const result = computeMetrics(events, []);

    expect(result.counts.planRenders).toBe(10);
    expect(result.counts.manualOverrides).toBe(3);
    expect(result.overrideRate).toBe(30); // 3/10 * 100
  });

  it('counts dev_harness source as manual override', () => {
    const events: EventRecord[] = [
      createEvent('plan_rendered'),
      createEvent('plan_rendered'),
      createEvent('mode_switched', { source: 'dev_harness', from: 'neutral', to: 'prep' }),
    ];

    const result = computeMetrics(events, []);

    expect(result.counts.manualOverrides).toBe(1);
    expect(result.overrideRate).toBe(50);
  });

  it('returns 0 when no plan renders', () => {
    const events: EventRecord[] = [
      createEvent('mode_switched', { trigger: 'explicit_user_action' }),
    ];

    const result = computeMetrics(events, []);

    expect(result.overrideRate).toBe(0);
  });
});

// ============================================
// Capsule Open Rate Tests
// ============================================

describe('Capsule Open Rate', () => {
  it('calculates capsule_opened / plan_rendered', () => {
    const events: EventRecord[] = [
      ...Array(20).fill(null).map(() => createEvent('plan_rendered')),
      ...Array(4).fill(null).map(() => createEvent('capsule_opened')),
    ];

    const result = computeMetrics(events, []);

    expect(result.counts.capsuleOpens).toBe(4);
    expect(result.capsuleOpenRate).toBe(20); // 4/20 * 100
  });
});

// ============================================
// Bounce Rate Tests
// ============================================

describe('Bounce Rate', () => {
  it('calculates overall bounce rate = bounced / opened', () => {
    const events: EventRecord[] = [
      ...Array(10).fill(null).map(() => createEvent('session_opened', { mode: 'neutral_intent' })),
      ...Array(2).fill(null).map(() => createEvent('session_bounced', { mode: 'neutral_intent' })),
    ];

    const result = computeMetrics(events, []);

    expect(result.counts.sessionsOpened).toBe(10);
    expect(result.counts.sessionsBounced).toBe(2);
    expect(result.overallBounceRate).toBe(20); // 2/10 * 100
  });

  it('calculates bounce rate per mode', () => {
    const events: EventRecord[] = [
      // Neutral: 5 opened, 2 bounced = 40%
      ...Array(5).fill(null).map(() => createEvent('session_opened', { mode: 'neutral_intent' })),
      ...Array(2).fill(null).map(() => createEvent('session_bounced', { mode: 'neutral_intent' })),
      // Prep: 4 opened, 0 bounced = 0%
      ...Array(4).fill(null).map(() => createEvent('session_opened', { mode: 'meeting_prep' })),
      // Capture: 3 opened, 1 bounced = 33.3%
      ...Array(3).fill(null).map(() => createEvent('session_opened', { mode: 'meeting_capture' })),
      createEvent('session_bounced', { mode: 'meeting_capture' }),
    ];

    const result = computeMetrics(events, []);

    expect(result.bounceRates['neutral_intent']).toBe(40);
    expect(result.bounceRates['meeting_prep']).toBe(0);
    expect(result.bounceRates['meeting_capture']).toBeCloseTo(33.33, 1);
  });
});

describe('computeBounceRates', () => {
  it('groups by mode correctly', () => {
    const opened: EventRecord[] = [
      createEvent('session_opened', { mode: 'A' }),
      createEvent('session_opened', { mode: 'A' }),
      createEvent('session_opened', { mode: 'B' }),
    ];
    const bounced: EventRecord[] = [
      createEvent('session_bounced', { mode: 'A' }),
    ];

    const rates = computeBounceRates(opened, bounced);

    expect(rates['A']).toBe(50); // 1/2
    expect(rates['B']).toBe(0);  // 0/1
  });

  it('handles mode with bounces but no opens', () => {
    const opened: EventRecord[] = [];
    const bounced: EventRecord[] = [
      createEvent('session_bounced', { mode: 'orphan' }),
    ];

    // This edge case shouldn't happen in practice but tests robustness
    const rates = computeBounceRates(opened, bounced);

    expect(rates['orphan']).toBe(0); // 1/0 handled safely
  });
});

// ============================================
// Goal Utilization Tests
// ============================================

describe('Goal Utilization', () => {
  it('calculates meetings with goals / meetings opened in prep', () => {
    const events: EventRecord[] = [
      createEvent('meeting_prep_opened', { meetingId: 'meeting-1' }),
      createEvent('meeting_prep_opened', { meetingId: 'meeting-2' }),
      createEvent('meeting_prep_opened', { meetingId: 'meeting-3' }),
    ];

    const meetings: MeetingState[] = [
      createMeeting('meeting-1', { goals: 2 }), // Has goals
      createMeeting('meeting-2', { goals: 1 }), // Has goals
      createMeeting('meeting-3', { goals: 0 }), // No goals
    ];

    const result = computeMetrics(events, meetings);

    expect(result.counts.meetingsInPrep).toBe(3);
    expect(result.counts.meetingsWithGoals).toBe(2);
    expect(result.goalUtilization).toBeCloseTo(66.67, 1); // 2/3 * 100
  });

  it('only counts meetings that were opened in prep mode', () => {
    const events: EventRecord[] = [
      createEvent('meeting_prep_opened', { meetingId: 'meeting-1' }),
      // meeting-2 never opened in prep
    ];

    const meetings: MeetingState[] = [
      createMeeting('meeting-1', { goals: 1 }),
      createMeeting('meeting-2', { goals: 3 }), // Has goals but wasn't in prep
    ];

    const result = computeMetrics(events, meetings);

    expect(result.counts.meetingsInPrep).toBe(1);
    expect(result.counts.meetingsWithGoals).toBe(1);
    expect(result.goalUtilization).toBe(100);
  });

  it('returns 0 when no prep opens', () => {
    const events: EventRecord[] = [];
    const meetings: MeetingState[] = [
      createMeeting('meeting-1', { goals: 5 }),
    ];

    const result = computeMetrics(events, meetings);

    expect(result.goalUtilization).toBe(0);
  });
});

// ============================================
// Marker Utilization Tests
// ============================================

describe('Marker Utilization', () => {
  it('calculates meetings with markers / meetings opened in capture', () => {
    const events: EventRecord[] = [
      createEvent('meeting_capture_opened', { meetingId: 'meeting-1' }),
      createEvent('meeting_capture_opened', { meetingId: 'meeting-2' }),
    ];

    const meetings: MeetingState[] = [
      createMeeting('meeting-1', { markers: 3 }),
      createMeeting('meeting-2', { markers: 0 }),
    ];

    const result = computeMetrics(events, meetings);

    expect(result.counts.meetingsInCapture).toBe(2);
    expect(result.counts.meetingsWithMarkers).toBe(1);
    expect(result.markerUtilization).toBe(50);
  });
});

// ============================================
// Synthesis Completion Tests
// ============================================

describe('Synthesis Completion', () => {
  it('calculates synthesis completed / meetings ended', () => {
    const now = Date.now();
    const events: EventRecord[] = [
      createEvent('synthesis_completed', { meetingId: 'meeting-1' }),
      createEvent('synthesis_completed', { meetingId: 'meeting-2' }),
    ];

    const meetings: MeetingState[] = [
      createMeeting('meeting-1', { endTime: now - 60000 }), // Ended
      createMeeting('meeting-2', { endTime: now - 60000 }), // Ended
      createMeeting('meeting-3', { endTime: now - 60000 }), // Ended but no synthesis
      createMeeting('meeting-4', { endTime: now + 60000 }), // Not ended yet
    ];

    const result = computeMetrics(events, meetings, now);

    expect(result.counts.meetingsEnded).toBe(3);
    expect(result.counts.meetingsSynthesisCompleted).toBe(2);
    expect(result.synthesisCompletion).toBeCloseTo(66.67, 1);
  });
});

// ============================================
// Override Reasons Tests
// ============================================

describe('Override Reasons Aggregation', () => {
  it('groups and counts override reasons', () => {
    const overrides: EventRecord[] = [
      createEvent('mode_switched', { trigger: 'explicit_user_action', from: 'neutral', to: 'prep', reason: 'Wrong mode' }),
      createEvent('mode_switched', { trigger: 'explicit_user_action', from: 'neutral', to: 'prep', reason: 'Wrong mode' }),
      createEvent('mode_switched', { trigger: 'explicit_user_action', from: 'prep', to: 'capture', reason: 'Meeting started' }),
    ];

    const reasons = aggregateOverrideReasons(overrides);

    expect(reasons).toHaveLength(2);
    expect(reasons[0].reason).toBe('neutral → prep: Wrong mode');
    expect(reasons[0].count).toBe(2);
    expect(reasons[1].reason).toBe('prep → capture: Meeting started');
    expect(reasons[1].count).toBe(1);
  });

  it('sorts by count descending', () => {
    const overrides: EventRecord[] = [
      createEvent('mode_switched', { trigger: 'explicit', from: 'a', to: 'b', reason: 'rare' }),
      createEvent('mode_switched', { trigger: 'explicit', from: 'a', to: 'b', reason: 'common' }),
      createEvent('mode_switched', { trigger: 'explicit', from: 'a', to: 'b', reason: 'common' }),
      createEvent('mode_switched', { trigger: 'explicit', from: 'a', to: 'b', reason: 'common' }),
    ];

    const reasons = aggregateOverrideReasons(overrides);

    expect(reasons[0].count).toBe(3);
    expect(reasons[1].count).toBe(1);
  });

  it('limits to top 10 reasons', () => {
    const overrides: EventRecord[] = Array(15)
      .fill(null)
      .map((_, i) => createEvent('mode_switched', {
        trigger: 'explicit',
        from: 'a',
        to: 'b',
        reason: `Reason ${i}`,
      }));

    const reasons = aggregateOverrideReasons(overrides);

    expect(reasons).toHaveLength(10);
  });
});

// ============================================
// Days Covered Tests
// ============================================

describe('Days Covered', () => {
  it('counts unique days from event timestamps', () => {
    const day1 = new Date('2024-01-15T10:00:00Z').getTime();
    const day2 = new Date('2024-01-16T14:00:00Z').getTime();
    const day3 = new Date('2024-01-17T09:00:00Z').getTime();

    const events: EventRecord[] = [
      { id: '1', type: 'plan_rendered', timestamp: day1, payload: {} },
      { id: '2', type: 'plan_rendered', timestamp: day1 + 3600000, payload: {} }, // Same day
      { id: '3', type: 'plan_rendered', timestamp: day2, payload: {} },
      { id: '4', type: 'plan_rendered', timestamp: day3, payload: {} },
    ];

    const result = computeMetrics(events, []);

    expect(result.daysCovered).toBe(3);
  });
});

// ============================================
// Integration Tests
// ============================================

describe('computeMetrics Integration', () => {
  it('handles empty inputs gracefully', () => {
    const result = computeMetrics([], []);

    expect(result.overrideRate).toBe(0);
    expect(result.capsuleOpenRate).toBe(0);
    expect(result.goalUtilization).toBe(0);
    expect(result.markerUtilization).toBe(0);
    expect(result.synthesisCompletion).toBe(0);
    expect(result.overallBounceRate).toBe(0);
    expect(result.daysCovered).toBe(0);
  });

  it('computes all metrics correctly from mixed events', () => {
    const now = Date.now();
    const events: EventRecord[] = [
      // Plan renders
      ...Array(100).fill(null).map(() => createEvent('plan_rendered')),
      // Overrides (15 manual)
      ...Array(15).fill(null).map(() => createEvent('mode_switched', { trigger: 'explicit_user_action', from: 'a', to: 'b', reason: 'Test' })),
      // Auto switches (not counted)
      ...Array(10).fill(null).map(() => createEvent('mode_switched', { trigger: 'app_open' })),
      // Capsule opens
      ...Array(8).fill(null).map(() => createEvent('capsule_opened')),
      // Sessions
      ...Array(50).fill(null).map(() => createEvent('session_opened', { mode: 'neutral_intent' })),
      ...Array(5).fill(null).map(() => createEvent('session_bounced', { mode: 'neutral_intent' })),
      // Meeting lifecycle
      createEvent('meeting_prep_opened', { meetingId: 'M1' }),
      createEvent('meeting_prep_opened', { meetingId: 'M2' }),
      createEvent('meeting_capture_opened', { meetingId: 'M1' }),
      createEvent('synthesis_completed', { meetingId: 'M1' }),
    ];

    const meetings: MeetingState[] = [
      createMeeting('M1', { goals: 2, markers: 1, endTime: now - 60000 }),
      createMeeting('M2', { goals: 0, markers: 0, endTime: now - 60000 }),
    ];

    const result = computeMetrics(events, meetings, now);

    expect(result.overrideRate).toBe(15); // 15/100
    expect(result.capsuleOpenRate).toBe(8); // 8/100
    expect(result.overallBounceRate).toBe(10); // 5/50
    expect(result.goalUtilization).toBe(50); // 1/2 (only M1 has goals and was in prep)
    expect(result.markerUtilization).toBe(100); // 1/1 (M1 has markers and was in capture)
    expect(result.synthesisCompletion).toBe(50); // 1/2 meetings ended with synthesis
  });
});

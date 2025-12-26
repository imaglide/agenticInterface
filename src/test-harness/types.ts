/**
 * Test Harness Types
 *
 * Defines structures for scenario-based testing of the agentic interface.
 * Scenarios represent complete test states: meetings, goals, markers, intents.
 */

import type { MeetingState, StoredMy3Goal, StoredMarker, IntentItem } from '../storage/types';
import type { CalendarEvent, Attendee } from '../calendar/types';

/**
 * Time anchor determines how scenario times are interpreted.
 * - 'relative': Times are offsets from "now" (e.g., -30 = 30 min ago)
 * - 'absolute': Times are specific timestamps (useful for debugging specific moments)
 */
export type TimeAnchor = 'relative' | 'absolute';

/**
 * Scenario meeting extends storage meeting with relative time support.
 * Times in minutes relative to scenario start (negative = past, positive = future).
 */
export interface ScenarioMeeting {
  id: string;
  title: string;
  /** Minutes from scenario start. -60 = started 1 hour ago, 30 = starts in 30 min */
  startMinutes: number;
  /** Duration in minutes */
  durationMinutes: number;
  attendees: string[];
  goal?: string;
  /** Goals to pre-populate */
  goals?: Array<{
    text: string;
    achieved?: boolean;
  }>;
  /** Markers to pre-populate */
  markers?: Array<{
    type: 'decision' | 'action' | 'risk' | 'question';
    label?: string;
    /** Minutes from meeting start when marker was created */
    offsetMinutes?: number;
  }>;
  synthesisCompleted?: boolean;
}

/**
 * Scenario intent for pre-populating the intent ledger.
 */
export interface ScenarioIntent {
  scope: 'meeting' | 'session';
  type: 'goal' | 'question' | 'data_need' | 'action' | 'note';
  text: string;
  status?: 'open' | 'satisfied' | 'deferred';
  /** Meeting ID this intent is tied to (optional) */
  meetingId?: string;
}

/**
 * Scenario calendar event for simulating calendar context.
 */
export interface ScenarioCalendarEvent {
  id: string;
  iCalUid?: string;
  title: string;
  /** Minutes from scenario start */
  startMinutes: number;
  durationMinutes: number;
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>;
  location?: string;
  description?: string;
  isAllDay?: boolean;
}

/**
 * Complete test scenario definition.
 */
export interface TestScenario {
  /** Unique scenario identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this scenario tests */
  description: string;
  /** Categories for filtering scenarios */
  tags: string[];

  /** Calendar events to simulate */
  calendarEvents?: ScenarioCalendarEvent[];

  /** Meetings with state (goals, markers) */
  meetings?: ScenarioMeeting[];

  /** Intent ledger entries */
  intents?: ScenarioIntent[];

  /**
   * Expected initial mode when scenario loads.
   * Used for validation.
   */
  expectedMode?: 'neutral_intent' | 'meeting_prep' | 'meeting_capture' | 'meeting_synthesis_min';

  /**
   * Time offset from "now" to use as scenario anchor.
   * Useful for testing specific moments (e.g., "5 minutes before meeting").
   */
  timeOffsetMinutes?: number;
}

/**
 * Scenario execution state.
 */
export interface ScenarioState {
  /** Currently loaded scenario */
  activeScenario: TestScenario | null;
  /** When the scenario was loaded */
  loadedAt: number;
  /** Virtual time offset from real time (in ms) */
  timeOffset: number;
  /** Whether time is frozen */
  timeFrozen: boolean;
  /** Frozen timestamp if time is frozen */
  frozenTime: number | null;
}

/**
 * Time control interface for scenario testing.
 */
export interface TimeControl {
  /** Get current time (respects virtual time) */
  now: () => number;
  /** Set time offset from real time */
  setOffset: (offsetMs: number) => void;
  /** Freeze time at current moment */
  freeze: () => void;
  /** Unfreeze time */
  unfreeze: () => void;
  /** Jump to specific timestamp */
  jumpTo: (timestamp: number) => void;
  /** Advance time by milliseconds */
  advance: (ms: number) => void;
  /** Reset to real time */
  reset: () => void;
}

/**
 * Scenario loader result.
 */
export interface ScenarioLoadResult {
  success: boolean;
  error?: string;
  /** IDs of created meetings */
  meetingIds: string[];
  /** IDs of created intents */
  intentIds: string[];
  /** Number of calendar events simulated */
  calendarEventCount: number;
}

/**
 * Checkpoint for scenario iteration.
 * Represents a specific moment in a scenario's timeline.
 */
export interface ScenarioCheckpoint {
  id: string;
  name: string;
  description: string;
  /** Minutes from scenario start */
  offsetMinutes: number;
  /** Expected mode at this checkpoint */
  expectedMode?: string;
}

/**
 * Scenario with checkpoints for timeline iteration.
 */
export interface TimelineScenario extends TestScenario {
  /** Key moments to test in this scenario */
  checkpoints: ScenarioCheckpoint[];
}

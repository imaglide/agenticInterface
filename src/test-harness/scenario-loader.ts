/**
 * Scenario Loader
 *
 * Loads test scenarios into IndexedDB storage.
 * Handles time conversion, data population, and cleanup.
 */

import type {
  TestScenario,
  TimelineScenario,
  ScenarioMeeting,
  ScenarioIntent,
  ScenarioCalendarEvent,
  ScenarioLoadResult,
  ScenarioState,
  TimeControl,
  ScenarioCheckpoint,
} from './types';
import type { MeetingState, StoredMy3Goal, StoredMarker, IntentItem } from '../storage/types';
import type { CalendarEvent, Attendee } from '../calendar/types';
import {
  eventsStore,
  meetingsStore,
  intentsStore,
  aggregatesStore,
} from '../storage/db';
import { storage } from '../storage/storage-api';

// ============================================
// Time Control
// ============================================

/**
 * Global time control state.
 * Allows scenarios to manipulate "now" for testing.
 */
let timeState: {
  offset: number;
  frozen: boolean;
  frozenTime: number | null;
} = {
  offset: 0,
  frozen: false,
  frozenTime: null,
};

/**
 * Get current time, respecting virtual time settings.
 */
export function getVirtualNow(): number {
  if (timeState.frozen && timeState.frozenTime !== null) {
    return timeState.frozenTime;
  }
  return Date.now() + timeState.offset;
}

/**
 * Time control interface for scenarios.
 */
export const timeControl: TimeControl = {
  now: getVirtualNow,

  setOffset: (offsetMs: number) => {
    timeState.offset = offsetMs;
  },

  freeze: () => {
    timeState.frozen = true;
    timeState.frozenTime = getVirtualNow();
  },

  unfreeze: () => {
    // When unfreezing, adjust offset to continue from frozen point
    if (timeState.frozenTime !== null) {
      timeState.offset = timeState.frozenTime - Date.now();
    }
    timeState.frozen = false;
    timeState.frozenTime = null;
  },

  jumpTo: (timestamp: number) => {
    timeState.frozen = true;
    timeState.frozenTime = timestamp;
  },

  advance: (ms: number) => {
    if (timeState.frozen && timeState.frozenTime !== null) {
      timeState.frozenTime += ms;
    } else {
      timeState.offset += ms;
    }
  },

  reset: () => {
    timeState = { offset: 0, frozen: false, frozenTime: null };
  },
};

// ============================================
// Time Conversion
// ============================================

/**
 * Convert minutes offset to absolute timestamp.
 */
function minutesToTimestamp(minutes: number, anchorTime: number): number {
  return anchorTime + minutes * 60 * 1000;
}

// ============================================
// Data Conversion
// ============================================

/**
 * Convert scenario meeting to storage meeting.
 */
function convertMeeting(
  scenarioMeeting: ScenarioMeeting,
  anchorTime: number
): MeetingState {
  const startTime = minutesToTimestamp(scenarioMeeting.startMinutes, anchorTime);
  const endTime = startTime + scenarioMeeting.durationMinutes * 60 * 1000;

  // Convert goals to stored format with slot-based IDs
  const my3Goals: StoredMy3Goal[] = (scenarioMeeting.goals || [])
    .slice(0, 3)
    .map((g, index) => ({
      id: `g${index + 1}`,
      text: g.text,
      achieved: g.achieved ?? false,
      achievedAt: g.achieved ? startTime : undefined,
    }));

  // Convert markers with monotonic IDs
  const markers: StoredMarker[] = (scenarioMeeting.markers || []).map((m, index) => {
    const markerTime = m.offsetMinutes !== undefined
      ? startTime + m.offsetMinutes * 60 * 1000
      : startTime;
    return {
      id: `m${index + 1}`,
      type: m.type,
      label: m.label,
      timestamp: markerTime,
      meetingId: scenarioMeeting.id,
    };
  });

  return {
    id: scenarioMeeting.id,
    title: scenarioMeeting.title,
    startTime,
    endTime,
    attendees: scenarioMeeting.attendees,
    goal: scenarioMeeting.goal,
    my3Goals,
    markers,
    markerCounter: markers.length,
    synthesisCompleted: scenarioMeeting.synthesisCompleted ?? false,
    createdAt: anchorTime - 24 * 60 * 60 * 1000, // Created "yesterday"
    updatedAt: anchorTime,
  };
}

/**
 * Convert scenario intent to storage intent.
 */
function convertIntent(
  scenarioIntent: ScenarioIntent,
  anchorTime: number
): IntentItem {
  return {
    id: `intent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    scope: scenarioIntent.scope,
    type: scenarioIntent.type,
    text: scenarioIntent.text,
    status: scenarioIntent.status ?? 'open',
    meetingId: scenarioIntent.meetingId,
    createdAt: anchorTime - 60 * 60 * 1000, // Created "1 hour ago"
    updatedAt: anchorTime,
  };
}

/**
 * Convert scenario calendar event to CalendarEvent.
 * Used for simulating calendar context.
 */
export function convertCalendarEvent(
  scenarioEvent: ScenarioCalendarEvent,
  anchorTime: number
): CalendarEvent {
  const startTime = minutesToTimestamp(scenarioEvent.startMinutes, anchorTime);
  const endTime = startTime + scenarioEvent.durationMinutes * 60 * 1000;

  const attendees: Attendee[] = (scenarioEvent.attendees || []).map((a) => ({
    email: a.email,
    name: a.name,
    responseStatus: a.responseStatus ?? 'accepted',
    self: false,
  }));

  return {
    id: scenarioEvent.id,
    iCalUid: scenarioEvent.iCalUid,
    title: scenarioEvent.title,
    startTime,
    endTime,
    attendees,
    location: scenarioEvent.location,
    description: scenarioEvent.description,
    isAllDay: scenarioEvent.isAllDay ?? false,
  };
}

// ============================================
// Storage Operations
// ============================================

/**
 * Clear all scenario-related data from storage.
 */
export async function clearScenarioData(): Promise<void> {
  await Promise.all([
    meetingsStore.clear(),
    intentsStore.clear(),
    eventsStore.clear(),
    aggregatesStore.clear(),
  ]);
}

/**
 * Load a scenario into storage.
 */
export async function loadScenario(
  scenario: TestScenario,
  options: {
    clearExisting?: boolean;
    timeOffset?: number;
  } = {}
): Promise<ScenarioLoadResult> {
  const { clearExisting = true, timeOffset = 0 } = options;

  try {
    // Clear existing data if requested
    if (clearExisting) {
      await clearScenarioData();
    }

    // Calculate anchor time
    const baseTime = getVirtualNow();
    const anchorTime = baseTime + (scenario.timeOffsetMinutes ?? 0) * 60 * 1000 + timeOffset;

    // Set time offset for this scenario
    if (scenario.timeOffsetMinutes) {
      timeControl.setOffset(scenario.timeOffsetMinutes * 60 * 1000);
    }

    const meetingIds: string[] = [];
    const intentIds: string[] = [];

    // Load meetings
    if (scenario.meetings) {
      for (const scenarioMeeting of scenario.meetings) {
        const meeting = convertMeeting(scenarioMeeting, anchorTime);
        await storage.saveMeeting(meeting);
        meetingIds.push(meeting.id);

        // Log meeting created event
        await storage.logEvent('meeting_prep_opened', {
          meetingId: meeting.id,
          title: meeting.title,
          source: 'scenario_loader',
        });
      }
    }

    // Load intents
    if (scenario.intents) {
      for (const scenarioIntent of scenario.intents) {
        const intent = convertIntent(scenarioIntent, anchorTime);
        // Direct insert to avoid logEvent in saveIntent (already handles it)
        await intentsStore.add(intent);
        intentIds.push(intent.id);
      }
    }

    // Log scenario loaded event
    await storage.logEvent('user_interaction', {
      action: 'scenario_loaded',
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      meetingCount: meetingIds.length,
      intentCount: intentIds.length,
    });

    return {
      success: true,
      meetingIds,
      intentIds,
      calendarEventCount: scenario.calendarEvents?.length ?? 0,
    };
  } catch (error) {
    console.error('Failed to load scenario:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      meetingIds: [],
      intentIds: [],
      calendarEventCount: 0,
    };
  }
}

// ============================================
// Scenario State Management
// ============================================

let currentScenarioState: ScenarioState = {
  activeScenario: null,
  loadedAt: 0,
  timeOffset: 0,
  timeFrozen: false,
  frozenTime: null,
};

/**
 * Get current scenario state.
 */
export function getScenarioState(): ScenarioState {
  return {
    ...currentScenarioState,
    timeOffset: timeState.offset,
    timeFrozen: timeState.frozen,
    frozenTime: timeState.frozenTime,
  };
}

/**
 * Load scenario and update state.
 */
export async function activateScenario(
  scenario: TestScenario,
  options?: { clearExisting?: boolean }
): Promise<ScenarioLoadResult> {
  const result = await loadScenario(scenario, options);

  if (result.success) {
    currentScenarioState = {
      activeScenario: scenario,
      loadedAt: Date.now(),
      timeOffset: timeState.offset,
      timeFrozen: timeState.frozen,
      frozenTime: timeState.frozenTime,
    };
  }

  return result;
}

/**
 * Deactivate current scenario and reset time.
 */
export async function deactivateScenario(clearData = true): Promise<void> {
  if (clearData) {
    await clearScenarioData();
  }
  timeControl.reset();
  currentScenarioState = {
    activeScenario: null,
    loadedAt: 0,
    timeOffset: 0,
    timeFrozen: false,
    frozenTime: null,
  };
}

// ============================================
// Timeline Scenario Support
// ============================================

/**
 * Jump to a checkpoint in a timeline scenario.
 */
export function jumpToCheckpoint(
  scenario: TimelineScenario,
  checkpoint: ScenarioCheckpoint
): void {
  // Calculate time offset to reach this checkpoint
  const offsetMs = checkpoint.offsetMinutes * 60 * 1000;
  timeControl.jumpTo(Date.now() + offsetMs);
}

/**
 * Get simulated calendar events for current scenario.
 * Returns events with times adjusted for current virtual time.
 */
export function getSimulatedCalendarEvents(): CalendarEvent[] {
  const state = getScenarioState();
  if (!state.activeScenario?.calendarEvents) {
    return [];
  }

  const anchorTime = getVirtualNow();
  return state.activeScenario.calendarEvents.map((e) =>
    convertCalendarEvent(e, anchorTime)
  );
}

// ============================================
// Exports
// ============================================

export {
  type ScenarioLoadResult,
  type ScenarioState,
};

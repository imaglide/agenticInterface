/**
 * Storage API
 *
 * High-level API for persistence operations.
 * Implements the StorageAPI interface from types.ts.
 */

import {
  EventType,
  EventRecord,
  EventFilter,
  MeetingState,
  IntentItem,
  IntentScope,
  IntentStatus,
  DailyAggregate,
  SEMANTIC_EVENT_TYPES,
  NOISE_EVENT_TYPES,
} from './types';
import {
  eventsStore,
  meetingsStore,
  intentsStore,
  aggregatesStore,
} from './db';

// ============================================
// Utilities
// ============================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

// ============================================
// Event Operations
// ============================================

/**
 * Log an event to the event store.
 * Returns the generated event ID.
 */
export async function logEvent(
  type: EventType,
  payload: Record<string, unknown> = {}
): Promise<string> {
  const id = generateId();
  const record: EventRecord = {
    id,
    type,
    timestamp: Date.now(),
    payload,
  };

  await eventsStore.add(record);
  return id;
}

/**
 * Get events with optional filtering.
 */
export async function getEvents(filter?: EventFilter): Promise<EventRecord[]> {
  let events: EventRecord[];

  // Use time range if specified
  if (filter?.startTime !== undefined || filter?.endTime !== undefined) {
    events = await eventsStore.queryByTimeRange(filter.startTime, filter.endTime);
  } else {
    events = await eventsStore.getAll();
  }

  // Filter by types if specified
  if (filter?.types && filter.types.length > 0) {
    events = events.filter((e) => filter.types!.includes(e.type));
  }

  // Sort by timestamp descending (newest first)
  events.sort((a, b) => b.timestamp - a.timestamp);

  // Apply limit if specified
  if (filter?.limit !== undefined && filter.limit > 0) {
    events = events.slice(0, filter.limit);
  }

  return events;
}

/**
 * Get event count.
 */
export async function getEventCount(): Promise<number> {
  return eventsStore.count();
}

// ============================================
// Meeting Operations
// ============================================

/**
 * Get a meeting by ID.
 */
export async function getMeeting(id: string): Promise<MeetingState | null> {
  return meetingsStore.get(id);
}

/**
 * Get all meetings.
 */
export async function getAllMeetings(): Promise<MeetingState[]> {
  const meetings = await meetingsStore.getAll();
  // Sort by start time descending
  return meetings.sort((a, b) => b.startTime - a.startTime);
}

/**
 * Save (create or update) a meeting.
 */
export async function saveMeeting(meeting: MeetingState): Promise<void> {
  const now = Date.now();
  const existing = await meetingsStore.get(meeting.id);

  if (existing) {
    meeting.updatedAt = now;
    meeting.createdAt = existing.createdAt;
  } else {
    meeting.createdAt = now;
    meeting.updatedAt = now;
  }

  await meetingsStore.put(meeting);
}

/**
 * Delete a meeting by ID.
 */
export async function deleteMeeting(id: string): Promise<void> {
  await meetingsStore.delete(id);
}

/**
 * Update meeting goal.
 */
export async function updateMeetingGoal(
  meetingId: string,
  goal: string
): Promise<void> {
  const meeting = await meetingsStore.get(meetingId);
  if (meeting) {
    meeting.goal = goal;
    meeting.updatedAt = Date.now();
    await meetingsStore.put(meeting);
    await logEvent('meeting_goal_updated', { meetingId, goal });
  }
}

/**
 * Add a My3Goal to a meeting.
 * Uses slot-based IDs (g1, g2, g3) per WorkObjects spec §6.
 */
export async function addMy3Goal(
  meetingId: string,
  text: string
): Promise<string> {
  const meeting = await meetingsStore.get(meetingId);
  if (!meeting) {
    throw new Error(`Meeting ${meetingId} not found`);
  }

  if (meeting.my3Goals.length >= 3) {
    throw new Error('Cannot add more than 3 goals');
  }

  // Find first unused slot (g1, g2, or g3)
  const usedSlots = new Set(meeting.my3Goals.map((g) => g.id));
  let goalId = '';
  for (let slot = 1; slot <= 3; slot++) {
    const slotId = `g${slot}`;
    if (!usedSlots.has(slotId)) {
      goalId = slotId;
      break;
    }
  }

  // Fallback for legacy data with non-slot IDs
  if (!goalId) {
    goalId = `g${meeting.my3Goals.length + 1}`;
  }

  meeting.my3Goals.push({
    id: goalId,
    text,
    achieved: false,
  });
  meeting.updatedAt = Date.now();

  await meetingsStore.put(meeting);
  await logEvent('my3_goal_added', { meetingId, goalId, text });

  return goalId;
}

/**
 * Update a My3Goal.
 */
export async function updateMy3Goal(
  meetingId: string,
  goalId: string,
  text: string
): Promise<void> {
  const meeting = await meetingsStore.get(meetingId);
  if (!meeting) return;

  const goal = meeting.my3Goals.find((g) => g.id === goalId);
  if (goal) {
    goal.text = text;
    meeting.updatedAt = Date.now();
    await meetingsStore.put(meeting);
    await logEvent('my3_goal_updated', { meetingId, goalId, text });
  }
}

/**
 * Delete a My3Goal.
 *
 * TODO: When goals are fully migrated to WorkObjects, replace this with
 * soft-delete using `softDeleteWorkObject()` from work-object-api.ts.
 * See: docs/parking_lot.md - "Tombstone Accumulation"
 */
export async function deleteMy3Goal(
  meetingId: string,
  goalId: string
): Promise<void> {
  const meeting = await meetingsStore.get(meetingId);
  if (!meeting) return;

  meeting.my3Goals = meeting.my3Goals.filter((g) => g.id !== goalId);
  meeting.updatedAt = Date.now();

  await meetingsStore.put(meeting);
  await logEvent('my3_goal_deleted', { meetingId, goalId });
}

/**
 * Toggle My3Goal achievement status.
 */
export async function toggleMy3Goal(
  meetingId: string,
  goalId: string
): Promise<void> {
  const meeting = await meetingsStore.get(meetingId);
  if (!meeting) return;

  const goal = meeting.my3Goals.find((g) => g.id === goalId);
  if (goal) {
    goal.achieved = !goal.achieved;
    goal.achievedAt = goal.achieved ? Date.now() : undefined;
    meeting.updatedAt = Date.now();

    await meetingsStore.put(meeting);
    await logEvent('goal_checked', {
      meetingId,
      goalId,
      achieved: goal.achieved,
      achievedAt: goal.achievedAt,
    });
  }
}

/**
 * Add a marker to a meeting.
 * Uses monotonic counter for stable IDs (m1, m2, m3...).
 */
export async function addMarker(
  meetingId: string,
  type: 'decision' | 'action' | 'risk' | 'question',
  label?: string
): Promise<string> {
  const meeting = await meetingsStore.get(meetingId);
  if (!meeting) {
    throw new Error(`Meeting ${meetingId} not found`);
  }

  // Increment monotonic counter (never resets, even if markers deleted)
  const counter = (meeting.markerCounter ?? 0) + 1;
  meeting.markerCounter = counter;

  // Use monotonic ID: m1, m2, m3... (WorkObjects spec §7)
  const markerId = `m${counter}`;
  meeting.markers.push({
    id: markerId,
    type,
    label,
    timestamp: Date.now(),
    meetingId,
  });
  meeting.updatedAt = Date.now();

  await meetingsStore.put(meeting);
  await logEvent('marker_created', { meetingId, markerId, type, label });

  return markerId;
}

/**
 * Update marker label.
 */
export async function updateMarkerLabel(
  meetingId: string,
  markerId: string,
  label: string
): Promise<void> {
  const meeting = await meetingsStore.get(meetingId);
  if (!meeting) return;

  const marker = meeting.markers.find((m) => m.id === markerId);
  if (marker) {
    marker.label = label;
    meeting.updatedAt = Date.now();
    await meetingsStore.put(meeting);
    await logEvent('marker_labeled', { meetingId, markerId, label });
  }
}

/**
 * Mark meeting synthesis as completed.
 */
export async function completeSynthesis(meetingId: string): Promise<void> {
  const meeting = await meetingsStore.get(meetingId);
  if (!meeting) return;

  meeting.synthesisCompleted = true;
  meeting.updatedAt = Date.now();

  await meetingsStore.put(meeting);
  await logEvent('synthesis_completed', { meetingId });
}

// ============================================
// Intent Operations
// ============================================

/**
 * Get intents with optional filtering.
 */
export async function getIntents(
  filter?: { scope?: IntentScope; status?: IntentStatus }
): Promise<IntentItem[]> {
  let intents = await intentsStore.getAll();

  if (filter?.scope) {
    intents = intents.filter((i) => i.scope === filter.scope);
  }

  if (filter?.status) {
    intents = intents.filter((i) => i.status === filter.status);
  }

  // Sort by creation time descending
  return intents.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Save a new intent.
 */
export async function saveIntent(intent: Omit<IntentItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = Date.now();
  const id = generateId();

  const record: IntentItem = {
    ...intent,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await intentsStore.add(record);
  await logEvent('intent_created', {
    intentId: id,
    scope: intent.scope,
    type: intent.type,
    text: intent.text,
  });

  return id;
}

/**
 * Update intent status.
 */
export async function updateIntentStatus(
  id: string,
  status: IntentStatus
): Promise<void> {
  const intent = await intentsStore.get(id);
  if (!intent) return;

  const previousStatus = intent.status;
  intent.status = status;
  intent.updatedAt = Date.now();

  await intentsStore.put(intent);
  await logEvent('intent_status_changed', {
    intentId: id,
    previousStatus,
    newStatus: status,
  });
}

/**
 * Delete an intent.
 */
export async function deleteIntent(id: string): Promise<void> {
  await intentsStore.delete(id);
}

// ============================================
// Compaction Operations (§9.4)
// ============================================

const COMPACTION_THRESHOLD_DAYS = 30;
const COMPACTION_THRESHOLD_EVENTS = 10000;

/**
 * Compact noise events older than threshold.
 * Semantic events are preserved forever.
 */
export async function compactEvents(): Promise<{ removed: number; aggregated: number }> {
  const cutoffTime = Date.now() - COMPACTION_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  // Get all events
  const allEvents = await eventsStore.getAll();

  // Separate semantic and noise events
  const noiseEvents = allEvents.filter(
    (e) => NOISE_EVENT_TYPES.includes(e.type) && e.timestamp < cutoffTime
  );

  if (noiseEvents.length === 0) {
    return { removed: 0, aggregated: 0 };
  }

  // Group noise events by date
  const eventsByDate: Record<string, EventRecord[]> = {};
  for (const event of noiseEvents) {
    const dateStr = getDateString(event.timestamp);
    if (!eventsByDate[dateStr]) {
      eventsByDate[dateStr] = [];
    }
    eventsByDate[dateStr].push(event);
  }

  // Create aggregates for each date
  const aggregates: DailyAggregate[] = [];
  for (const [date, events] of Object.entries(eventsByDate)) {
    const rendersByMode: Record<string, number> = {};
    let capsuleOpenCount = 0;

    for (const event of events) {
      if (event.type === 'plan_rendered') {
        const mode = (event.payload.mode as string) || 'unknown';
        rendersByMode[mode] = (rendersByMode[mode] || 0) + 1;
      }
      if (event.type === 'capsule_opened') {
        capsuleOpenCount++;
      }
    }

    aggregates.push({
      id: `aggregate-${date}`,
      date,
      rendersByMode,
      overrideCount: 0, // Would need additional tracking
      capsuleOpenCount,
      totalEvents: events.length,
    });
  }

  // Save aggregates
  for (const agg of aggregates) {
    const existing = await aggregatesStore.get(agg.id);
    if (existing) {
      // Merge with existing aggregate
      for (const [mode, count] of Object.entries(agg.rendersByMode)) {
        existing.rendersByMode[mode] = (existing.rendersByMode[mode] || 0) + count;
      }
      existing.capsuleOpenCount += agg.capsuleOpenCount;
      existing.totalEvents += agg.totalEvents;
      await aggregatesStore.put(existing);
    } else {
      await aggregatesStore.add(agg);
    }
  }

  // Delete compacted noise events
  const idsToDelete = noiseEvents.map((e) => e.id);
  await eventsStore.deleteMany(idsToDelete);

  return {
    removed: idsToDelete.length,
    aggregated: aggregates.length,
  };
}

/**
 * Get daily aggregates.
 */
export async function getAggregates(
  startDate?: string,
  endDate?: string
): Promise<DailyAggregate[]> {
  const all = await aggregatesStore.getAll();

  let filtered = all;
  if (startDate) {
    filtered = filtered.filter((a) => a.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((a) => a.date <= endDate);
  }

  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

// ============================================
// Export Consolidated API
// ============================================

export const storage = {
  // Events
  logEvent,
  getEvents,
  getEventCount,
  compactEvents,
  getAggregates,

  // Meetings
  getMeeting,
  getAllMeetings,
  saveMeeting,
  deleteMeeting,
  updateMeetingGoal,
  addMy3Goal,
  updateMy3Goal,
  deleteMy3Goal,
  toggleMy3Goal,
  addMarker,
  updateMarkerLabel,
  completeSynthesis,

  // Intents
  getIntents,
  saveIntent,
  updateIntentStatus,
  deleteIntent,
};

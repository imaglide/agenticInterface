/**
 * Migration Utilities for WorkObjects
 *
 * Helper functions for converting existing MeetingState data
 * to WorkObjects. These are used in Phase 2 when WorkObjects
 * are actually integrated into the UI.
 *
 * Phase 1: These utilities exist but are not called.
 * Phase 2: Called during lazy migration on meeting access.
 */

import type { MeetingState, StoredMy3Goal, StoredMarker } from '../types';
import type {
  WorkObject,
  MeetingUidMapping,
  WorkObjectSource,
} from '../work-object-types';
import { workObjectIds, generateMeetingUid } from '../work-object-id';

// ============================================
// Legacy Meeting Migration
// ============================================

/**
 * Create a meeting UID mapping for a legacy meeting.
 *
 * Legacy meetings don't have iCalUID (created before Phase 1),
 * so we use eventId-based mapping with empty iCalUID.
 *
 * @param meeting - Existing MeetingState
 * @returns MeetingUidMapping for the meeting
 */
export function createMappingForLegacyMeeting(
  meeting: MeetingState
): MeetingUidMapping {
  const meetingUid = generateMeetingUid();

  return {
    meetingUid,
    provider: 'gcal',
    iCalUid: '', // Unknown for legacy meetings
    eventId: meeting.id, // Old meeting ID becomes eventId
    calendarId: 'primary',
    startTimeIso: new Date(meeting.startTime).toISOString(),
    createdAtIso: new Date(meeting.createdAt).toISOString(),
  };
}

// ============================================
// Goal Conversion
// ============================================

/**
 * Convert a stored My3Goal to a WorkObject.
 *
 * Maps array index 0,1,2 to slots g1,g2,g3.
 * The slot is the identity; the text is state.
 *
 * @param goal - Existing StoredMy3Goal
 * @param meetingUid - Internal meeting UID
 * @param slotIndex - Array index (0, 1, or 2)
 * @returns WorkObject representing the goal slot
 */
export function convertGoalToWorkObject(
  goal: StoredMy3Goal,
  meetingUid: string,
  slotIndex: number
): WorkObject {
  const slot = (slotIndex + 1) as 1 | 2 | 3;
  const now = new Date().toISOString();

  return {
    id: workObjectIds.goal(meetingUid, slot),
    type: 'goal',
    source: 'user' as WorkObjectSource,
    title: goal.text,
    payload: {
      achieved: goal.achieved,
      achievedAt: goal.achievedAt,
      legacyId: goal.id, // Preserve for debugging/audit
    },
    // Timestamps unknown from legacy - use current time
    createdAtIso: now,
    updatedAtIso: now,
    deletedAtIso: undefined,
  };
}

/**
 * Convert all My3Goals from a meeting to WorkObjects.
 *
 * @param goals - Array of StoredMy3Goal
 * @param meetingUid - Internal meeting UID
 * @returns Array of WorkObjects (up to 3)
 */
export function convertAllGoalsToWorkObjects(
  goals: StoredMy3Goal[],
  meetingUid: string
): WorkObject[] {
  // Limit to first 3 goals (enforce slot constraint)
  return goals
    .slice(0, 3)
    .map((goal, index) => convertGoalToWorkObject(goal, meetingUid, index));
}

// ============================================
// Marker Conversion
// ============================================

/**
 * Convert a stored marker to a WorkObject.
 *
 * Requires a marker number from the monotonic counter.
 * Preserves the original timestamp for audit trail.
 *
 * @param marker - Existing StoredMarker
 * @param meetingUid - Internal meeting UID
 * @param markerNumber - Monotonic counter value for this marker
 * @returns WorkObject representing the marker
 */
export function convertMarkerToWorkObject(
  marker: StoredMarker,
  meetingUid: string,
  markerNumber: number
): WorkObject {
  return {
    id: workObjectIds.marker(meetingUid, markerNumber),
    type: 'marker',
    source: 'user' as WorkObjectSource,
    title: marker.label,
    payload: {
      markerType: marker.type, // decision | action | risk | question
      timestamp: marker.timestamp,
      legacyId: marker.id, // Preserve for debugging/audit
    },
    // Use original marker timestamp
    createdAtIso: new Date(marker.timestamp).toISOString(),
    updatedAtIso: new Date(marker.timestamp).toISOString(),
    deletedAtIso: undefined,
  };
}

/**
 * Convert all markers from a meeting to WorkObjects.
 *
 * Assigns monotonic numbers in order of original creation.
 *
 * @param markers - Array of StoredMarker
 * @param meetingUid - Internal meeting UID
 * @param startingNumber - First marker number to use (usually 1)
 * @returns Array of WorkObjects and the next counter value
 */
export function convertAllMarkersToWorkObjects(
  markers: StoredMarker[],
  meetingUid: string,
  startingNumber: number = 1
): { workObjects: WorkObject[]; nextCounter: number } {
  // Sort by timestamp to ensure consistent numbering
  const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);

  const workObjects = sortedMarkers.map((marker, index) =>
    convertMarkerToWorkObject(marker, meetingUid, startingNumber + index)
  );

  return {
    workObjects,
    nextCounter: startingNumber + markers.length,
  };
}

// ============================================
// Meeting WorkObject Conversion
// ============================================

/**
 * Create a WorkObject for the meeting itself.
 *
 * @param meeting - Existing MeetingState
 * @param meetingUid - Internal meeting UID
 * @returns WorkObject representing the meeting
 */
export function createMeetingWorkObject(
  meeting: MeetingState,
  meetingUid: string
): WorkObject {
  return {
    id: workObjectIds.meeting(meetingUid),
    type: 'meeting',
    source: 'system' as WorkObjectSource,
    title: meeting.title,
    dataRef: meeting.id, // Reference to original meeting ID
    payload: {
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      attendees: meeting.attendees,
    },
    createdAtIso: new Date(meeting.createdAt).toISOString(),
    updatedAtIso: new Date(meeting.updatedAt).toISOString(),
    deletedAtIso: undefined,
  };
}

/**
 * Create a WorkObject for the meeting goal (calendar event description).
 *
 * @param meeting - Existing MeetingState
 * @param meetingUid - Internal meeting UID
 * @returns WorkObject for meeting goal, or null if no goal set
 */
export function createMeetingGoalWorkObject(
  meeting: MeetingState,
  meetingUid: string
): WorkObject | null {
  if (!meeting.goal) {
    return null;
  }

  return {
    id: workObjectIds.meetingGoal(meetingUid),
    type: 'meeting_goal',
    source: 'system' as WorkObjectSource,
    title: meeting.goal,
    payload: {},
    createdAtIso: new Date(meeting.createdAt).toISOString(),
    updatedAtIso: new Date(meeting.updatedAt).toISOString(),
    deletedAtIso: undefined,
  };
}

// ============================================
// Full Meeting Migration
// ============================================

/**
 * Result of migrating a complete meeting to WorkObjects.
 */
export interface MeetingMigrationResult {
  mapping: MeetingUidMapping;
  workObjects: WorkObject[];
  markerCounter: number;
}

/**
 * Migrate a complete meeting to WorkObjects.
 *
 * Creates:
 * - Meeting UID mapping
 * - Meeting WorkObject
 * - Meeting goal WorkObject (if set)
 * - Goal slot WorkObjects (up to 3)
 * - Marker WorkObjects
 *
 * @param meeting - Existing MeetingState
 * @returns Full migration result
 */
export function migrateMeetingToWorkObjects(
  meeting: MeetingState
): MeetingMigrationResult {
  // Create mapping
  const mapping = createMappingForLegacyMeeting(meeting);
  const meetingUid = mapping.meetingUid;

  const workObjects: WorkObject[] = [];

  // Meeting itself
  workObjects.push(createMeetingWorkObject(meeting, meetingUid));

  // Meeting goal
  const goalWo = createMeetingGoalWorkObject(meeting, meetingUid);
  if (goalWo) {
    workObjects.push(goalWo);
  }

  // My3Goals
  const goalWorkObjects = convertAllGoalsToWorkObjects(
    meeting.my3Goals,
    meetingUid
  );
  workObjects.push(...goalWorkObjects);

  // Markers
  const { workObjects: markerWorkObjects, nextCounter } =
    convertAllMarkersToWorkObjects(meeting.markers, meetingUid);
  workObjects.push(...markerWorkObjects);

  return {
    mapping,
    workObjects,
    markerCounter: nextCounter - 1, // Counter is last used number
  };
}

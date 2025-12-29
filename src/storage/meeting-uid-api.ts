/**
 * Meeting UID API
 *
 * Stable identity mapping between external calendar events
 * and internal meeting UIDs. See spec §4.1.
 *
 * Lookup priority:
 * 1. iCalUID (most stable, survives edits)
 * 2. eventId (secondary locator)
 * 3. Generate new if not found
 */

import { meetingUidMappingsStore, meetingMetadataStore } from './db';
import { generateMeetingUid } from './work-object-id';
import { logEvent } from './storage-api';
import type { MeetingUidMapping, MeetingMetadata } from './work-object-types';
import type { CalendarEvent } from '@/calendar/types';

// ============================================
// Reschedule Detection Helpers
// ============================================

/**
 * Check if two ISO timestamps are on the same calendar day but different times.
 * Used to detect rescheduled recurring instances (e.g., standup moved from 9am to 10am).
 *
 * @param iso1 - First ISO timestamp
 * @param iso2 - Second ISO timestamp
 * @returns True if same date but different time
 */
export function isSameDateDifferentTime(iso1: string, iso2: string): boolean {
  if (iso1 === iso2) return false;

  const d1 = new Date(iso1);
  const d2 = new Date(iso2);

  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * Update the startTimeIso for an existing mapping when a recurring instance is rescheduled.
 * Preserves the meeting_uid to maintain WorkObject associations.
 *
 * @param mapping - Existing mapping to update
 * @param newStartTimeIso - New start time after reschedule
 */
async function updateMappingForReschedule(
  mapping: MeetingUidMapping,
  newStartTimeIso: string
): Promise<void> {
  const oldStartTimeIso = mapping.startTimeIso;

  // Set originalStartTimeIso if not already set (first reschedule)
  if (!mapping.originalStartTimeIso) {
    mapping.originalStartTimeIso = oldStartTimeIso;
  }

  mapping.startTimeIso = newStartTimeIso;
  await meetingUidMappingsStore.put(mapping);

  await logEvent('meeting_uid_rescheduled', {
    meetingUid: mapping.meetingUid,
    iCalUid: mapping.iCalUid,
    oldStartTimeIso,
    newStartTimeIso,
    originalStartTimeIso: mapping.originalStartTimeIso,
  });
}

// ============================================
// Meeting UID Resolution
// ============================================

/**
 * Get or create a stable meeting UID for a calendar event.
 *
 * First encounter with an event creates a new mapping.
 * Subsequent encounters return the existing UID.
 *
 * For recurring events, uses iCalUID + startTime to disambiguate
 * individual instances.
 *
 * @param event - Calendar event from Google Calendar
 * @returns Internal meeting UID (stable across sessions)
 */
export async function getOrCreateMeetingUid(
  event: CalendarEvent
): Promise<string> {
  const startTimeIso = new Date(event.startTime).toISOString();

  // Try iCalUID first (most stable identifier)
  if (event.iCalUid) {
    const byICalUid = await meetingUidMappingsStore.getByICalUid(event.iCalUid);

    if (byICalUid.length > 0) {
      // For recurring events, also match start time
      const exactMatch = byICalUid.find(
        (m) => m.startTimeIso === startTimeIso
      );

      if (exactMatch) {
        return exactMatch.meetingUid;
      }

      // Check for same-day reschedule (e.g., standup moved from 9am to 10am)
      // This preserves the meeting_uid and WorkObject associations
      const sameDayMatch = byICalUid.find((m) =>
        isSameDateDifferentTime(m.startTimeIso, startTimeIso)
      );

      if (sameDayMatch) {
        // Rescheduled instance - update the mapping rather than creating new
        await updateMappingForReschedule(sameDayMatch, startTimeIso);
        return sameDayMatch.meetingUid;
      }

      // No match - new recurring instance, fall through to create new mapping
    }
  }

  // Try eventId as fallback
  const byEventId = await meetingUidMappingsStore.getByEventId(event.id);
  if (byEventId.length > 0) {
    return byEventId[0].meetingUid;
  }

  // No existing mapping - create new one
  return createMeetingUidMapping(event);
}

/**
 * Create a new meeting UID mapping for a calendar event.
 * Also initializes meeting metadata with marker counter = 0.
 */
async function createMeetingUidMapping(event: CalendarEvent): Promise<string> {
  const meetingUid = generateMeetingUid();
  const now = new Date().toISOString();
  const startTimeIso = new Date(event.startTime).toISOString();

  const mapping: MeetingUidMapping = {
    meetingUid,
    provider: 'gcal',
    iCalUid: event.iCalUid || '',
    eventId: event.id,
    calendarId: 'primary', // TODO: capture from API when available
    startTimeIso,
    originalStartTimeIso: startTimeIso, // Set on creation for audit trail
    createdAtIso: now,
  };

  await meetingUidMappingsStore.put(mapping);

  // Initialize metadata with marker counter at 0
  const metadata: MeetingMetadata = {
    meetingUid,
    markerCounter: 0,
    updatedAtIso: now,
  };
  await meetingMetadataStore.put(metadata);

  return meetingUid;
}

// ============================================
// Mapping Lookups
// ============================================

/**
 * Get the mapping for a meeting UID (reverse lookup).
 *
 * @param meetingUid - Internal meeting UID
 * @returns Mapping with external IDs, or null if not found
 */
export async function getMeetingMapping(
  meetingUid: string
): Promise<MeetingUidMapping | null> {
  return meetingUidMappingsStore.get(meetingUid);
}

/**
 * Find meeting UID by external event ID.
 *
 * @param eventId - Google Calendar event ID
 * @returns Internal meeting UID, or null if not found
 */
export async function findMeetingUidByEventId(
  eventId: string
): Promise<string | null> {
  const mappings = await meetingUidMappingsStore.getByEventId(eventId);
  return mappings.length > 0 ? mappings[0].meetingUid : null;
}

/**
 * Find meeting UID by iCalUID.
 *
 * @param iCalUid - iCalendar UID
 * @param startTimeIso - Optional start time for recurring event instances
 * @returns Internal meeting UID, or null if not found
 */
export async function findMeetingUidByICalUid(
  iCalUid: string,
  startTimeIso?: string
): Promise<string | null> {
  const mappings = await meetingUidMappingsStore.getByICalUid(iCalUid);

  if (mappings.length === 0) {
    return null;
  }

  if (startTimeIso) {
    const exactMatch = mappings.find((m) => m.startTimeIso === startTimeIso);
    return exactMatch?.meetingUid ?? null;
  }

  return mappings[0].meetingUid;
}

// ============================================
// Marker Counter Management
// ============================================

/**
 * Get the next marker number for a meeting and increment counter.
 * Counter never resets, even if markers are deleted.
 *
 * @param meetingUid - Internal meeting UID
 * @returns Next marker number to use (1-indexed)
 */
export async function getNextMarkerNumber(meetingUid: string): Promise<number> {
  const metadata = await meetingMetadataStore.get(meetingUid);

  if (!metadata) {
    // Initialize if missing (shouldn't happen if mapping was created properly)
    const newMetadata: MeetingMetadata = {
      meetingUid,
      markerCounter: 1,
      updatedAtIso: new Date().toISOString(),
    };
    await meetingMetadataStore.put(newMetadata);
    return 1;
  }

  // Increment and save
  const nextNumber = metadata.markerCounter + 1;
  metadata.markerCounter = nextNumber;
  metadata.updatedAtIso = new Date().toISOString();
  await meetingMetadataStore.put(metadata);

  return nextNumber;
}

/**
 * Get current marker count without incrementing.
 *
 * @param meetingUid - Internal meeting UID
 * @returns Current marker count (0 if no markers created yet)
 */
export async function getMarkerCount(meetingUid: string): Promise<number> {
  const metadata = await meetingMetadataStore.get(meetingUid);
  return metadata?.markerCounter ?? 0;
}

/**
 * Get meeting metadata.
 *
 * @param meetingUid - Internal meeting UID
 * @returns Meeting metadata, or null if not found
 */
export async function getMeetingMetadata(
  meetingUid: string
): Promise<MeetingMetadata | null> {
  return meetingMetadataStore.get(meetingUid);
}

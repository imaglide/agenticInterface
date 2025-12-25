/**
 * WorkObject ID Factory
 *
 * Deterministic ID generation for WorkObjects.
 * See spec §5: WorkObject ID System (Canonical)
 *
 * Format: wo:<type>:<scope>:<local_id>
 * Scope: mtg:<meeting_uid> for meeting-scoped objects
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  WorkObjectType,
  WorkObjectScope,
  ParsedWorkObjectId,
} from './work-object-types';

// ============================================
// Meeting UID Generation
// ============================================

/**
 * Generate a new meeting UID.
 * This is the stable internal identifier for a meeting.
 */
export function generateMeetingUid(): string {
  return uuidv4();
}

// ============================================
// Scope Building
// ============================================

/**
 * Build a scope string from a meeting UID.
 */
export function buildScope(meetingUid: string): WorkObjectScope {
  return `mtg:${meetingUid}`;
}

/**
 * Extract meeting UID from a scope string.
 */
export function getMeetingUidFromScope(scope: WorkObjectScope): string {
  return scope.replace('mtg:', '');
}

// ============================================
// Core ID Factory
// ============================================

/**
 * Create a WorkObject ID from components.
 *
 * @param type - The WorkObject type
 * @param meetingUid - The meeting UID for scope
 * @param localId - The local identifier within the scope
 * @returns Canonical WorkObject ID
 */
export function createWorkObjectId(
  type: WorkObjectType,
  meetingUid: string,
  localId: string
): string {
  const scope = buildScope(meetingUid);
  return `wo:${type}:${scope}:${localId}`;
}

// ============================================
// Type-Specific ID Generators
// ============================================

/**
 * Factory functions for each WorkObject type.
 * Uses deterministic IDs where possible, UUIDs for user content.
 */
export const workObjectIds = {
  /**
   * Meeting WorkObject ID.
   * Uses meeting UID as both scope and local ID.
   */
  meeting: (meetingUid: string): string =>
    createWorkObjectId('meeting', meetingUid, meetingUid),

  /**
   * Meeting goal (the calendar event's goal/description).
   * One per meeting, uses meeting UID as local ID.
   */
  meetingGoal: (meetingUid: string): string =>
    createWorkObjectId('meeting_goal', meetingUid, meetingUid),

  /**
   * My3Goals slot ID (g1, g2, g3).
   * Fixed slots - slot is the identity, content is state.
   *
   * @param meetingUid - Meeting UID
   * @param slot - Slot number (1, 2, or 3)
   */
  goal: (meetingUid: string, slot: 1 | 2 | 3): string =>
    createWorkObjectId('goal', meetingUid, `g${slot}`),

  /**
   * Marker ID using monotonic counter.
   * Counter never resets, even if markers are deleted.
   *
   * @param meetingUid - Meeting UID
   * @param counter - Marker number from meeting's counter
   */
  marker: (meetingUid: string, counter: number): string =>
    createWorkObjectId('marker', meetingUid, `m${counter}`),

  /**
   * Note ID (UUID-based, user-created).
   */
  note: (meetingUid: string): string =>
    createWorkObjectId('note', meetingUid, uuidv4()),

  /**
   * Group ID (UUID-based, user-created).
   */
  group: (meetingUid: string): string =>
    createWorkObjectId('group', meetingUid, uuidv4()),

  /**
   * Link ID (UUID-based, user-created).
   */
  link: (meetingUid: string): string =>
    createWorkObjectId('link', meetingUid, uuidv4()),
};

// ============================================
// ID Parsing
// ============================================

/**
 * Parse a WorkObject ID into its components.
 *
 * @param id - The WorkObject ID to parse
 * @returns Parsed components, or null if invalid
 *
 * @example
 * parseWorkObjectId('wo:marker:mtg:abc-123:m5')
 * // { prefix: 'wo', type: 'marker', scope: 'mtg:abc-123', localId: 'm5' }
 */
export function parseWorkObjectId(id: string): ParsedWorkObjectId | null {
  const parts = id.split(':');

  // Minimum: wo:type:scopeType:scopeId:localId (5 parts)
  if (parts.length < 5 || parts[0] !== 'wo') {
    return null;
  }

  const [prefix, type, scopeType, scopeId, ...localIdParts] = parts;

  // Validate type
  const validTypes: WorkObjectType[] = [
    'meeting',
    'meeting_goal',
    'goal',
    'marker',
    'note',
    'group',
    'link',
  ];
  if (!validTypes.includes(type as WorkObjectType)) {
    return null;
  }

  // Validate scope type
  if (scopeType !== 'mtg') {
    return null;
  }

  const localId = localIdParts.join(':');

  return {
    prefix: 'wo',
    type: type as WorkObjectType,
    scope: `${scopeType}:${scopeId}` as WorkObjectScope,
    localId,
  };
}

/**
 * Check if a string is a valid WorkObject ID.
 */
export function isValidWorkObjectId(id: string): boolean {
  return parseWorkObjectId(id) !== null;
}

// ============================================
// Scope Comparison
// ============================================

/**
 * Check if two WorkObject IDs share the same scope.
 * Used to enforce cross-scope linking restrictions.
 *
 * @param id1 - First WorkObject ID
 * @param id2 - Second WorkObject ID
 * @returns true if both IDs are valid and share the same scope
 */
export function isSameScope(id1: string, id2: string): boolean {
  const parsed1 = parseWorkObjectId(id1);
  const parsed2 = parseWorkObjectId(id2);

  if (!parsed1 || !parsed2) {
    return false;
  }

  return parsed1.scope === parsed2.scope;
}

/**
 * Extract the meeting UID from a WorkObject ID.
 *
 * @param workObjectId - The WorkObject ID
 * @returns Meeting UID, or null if invalid
 */
export function getMeetingUidFromWorkObjectId(
  workObjectId: string
): string | null {
  const parsed = parseWorkObjectId(workObjectId);
  if (!parsed) return null;
  return getMeetingUidFromScope(parsed.scope);
}

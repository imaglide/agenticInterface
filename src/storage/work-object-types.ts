/**
 * WorkObject Type Definitions
 *
 * Core types for the WorkObject semantic layer.
 * See spec: docs/work_objects_and_agentic_work_surfaces.md
 */

// ============================================
// WorkObject ID System (Spec §5)
// ============================================

/**
 * WorkObject types that can exist in the system.
 * Each type has specific ID generation rules.
 */
export type WorkObjectType =
  | 'meeting'       // wo:meeting:mtg:<uid>:<uid>
  | 'meeting_goal'  // wo:meeting_goal:mtg:<uid>:<uid>
  | 'goal'          // wo:goal:mtg:<uid>:g1|g2|g3 (fixed slots)
  | 'marker'        // wo:marker:mtg:<uid>:m1|m2... (monotonic counter)
  | 'note'          // wo:note:mtg:<uid>:<uuid>
  | 'group'         // wo:group:mtg:<uid>:<uuid>
  | 'link';         // wo:link:mtg:<uid>:<uuid>

/**
 * Source of the WorkObject creation.
 */
export type WorkObjectSource = 'user' | 'agent' | 'system';

/**
 * Scope prefix for WorkObject IDs.
 * Currently only meeting scope is supported.
 */
export type WorkObjectScope = `mtg:${string}`;

// ============================================
// Core WorkObject Interface (Spec §8)
// ============================================

/**
 * The core WorkObject interface.
 * Every actionable UI element becomes a WorkObject.
 */
export interface WorkObject {
  /** Canonical ID: wo:<type>:<scope>:<local_id> */
  id: string;
  /** Type discriminator */
  type: WorkObjectType;
  /** Who created this object */
  source: WorkObjectSource;
  /** Short human-readable label */
  title?: string;
  /** Reference to external data (calendar event, etc.) */
  dataRef?: string;
  /** Type-specific payload data */
  payload?: Record<string, unknown>;
  /** ISO timestamp of creation */
  createdAtIso: string;
  /** ISO timestamp of last update */
  updatedAtIso: string;
  /** ISO timestamp of soft delete (tombstone) */
  deletedAtIso?: string;
}

// ============================================
// Meeting UID Mapping (Spec §4.1)
// ============================================

/**
 * Maps stable internal meeting UID to external calendar identifiers.
 * iCalUID is primary identity, eventId is secondary locator.
 */
export interface MeetingUidMapping {
  /** Internal UUID for this meeting */
  meetingUid: string;
  /** Calendar provider */
  provider: 'gcal';
  /** Primary identity (stable across edits) */
  iCalUid: string;
  /** Secondary locator (Google's eventId) */
  eventId: string;
  /** Calendar ID from provider */
  calendarId: string;
  /** Start time for recurring instance disambiguation */
  startTimeIso: string;
  /** When this mapping was created */
  createdAtIso: string;
}

/**
 * Per-meeting metadata including marker counter.
 */
export interface MeetingMetadata {
  /** Internal meeting UID */
  meetingUid: string;
  /** Monotonic counter for markers (never resets) */
  markerCounter: number;
  /** Last update timestamp */
  updatedAtIso: string;
}

// ============================================
// Flags (Spec §9)
// ============================================

/**
 * Flag types that can be applied to WorkObjects.
 */
export type FlagType = 'important' | 'risk' | 'followup';

/**
 * A flag applied to a WorkObject.
 * Stored as separate normalized records, not embedded in payload.
 */
export interface WorkObjectFlag {
  /** The WorkObject this flag applies to */
  workObjectId: string;
  /** Type of flag */
  flagType: FlagType;
  /** Whether the flag is currently set */
  isSet: boolean;
  /** When the flag was set/unset */
  setAtIso: string;
  /** Who set this flag */
  setBy: 'user' | 'agent_suggestion';
}

// ============================================
// Links (Spec §10)
// ============================================

/**
 * Relationship types between WorkObjects.
 * Do not add more in V1.
 */
export type LinkType = 'related' | 'supports' | 'blocks' | 'duplicates';

/**
 * A link between two WorkObjects.
 * Cross-scope linking is disallowed in V1.
 */
export interface WorkLink {
  /** Link ID: wo:link:mtg:<uid>:<uuid> */
  id: string;
  /** Source WorkObject ID */
  fromId: string;
  /** Target WorkObject ID */
  toId: string;
  /** Relationship type */
  type: LinkType;
  /** When the link was created */
  createdAtIso: string;
  /** Tombstone timestamp */
  deletedAtIso?: string;
}

// ============================================
// Parsed ID Type
// ============================================

/**
 * Result of parsing a WorkObject ID.
 */
export interface ParsedWorkObjectId {
  prefix: 'wo';
  type: WorkObjectType;
  scope: WorkObjectScope;
  localId: string;
}

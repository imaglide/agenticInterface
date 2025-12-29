/**
 * Persistence Types
 *
 * Type definitions for IndexedDB storage.
 * See spec §9 Intent Capture & Ledger.
 */

// ============================================
// Event Log Types (§9.3)
// ============================================

export type EventType =
  | 'plan_rendered'
  | 'mode_switched'
  | 'capsule_opened'
  | 'meeting_goal_updated'
  | 'my3_goal_added'
  | 'my3_goal_updated'
  | 'my3_goal_deleted'
  | 'my3_goal_restored'
  | 'goal_checked'
  | 'marker_created'
  | 'marker_labeled'
  | 'marker_deleted'
  | 'synthesis_completed'
  | 'intent_created'
  | 'intent_status_changed'
  | 'thumb_feedback'
  // Session tracking
  | 'session_opened'
  | 'session_bounced'
  | 'session_interacted'
  | 'user_interaction'
  // Meeting lifecycle
  | 'meeting_prep_opened'
  | 'meeting_capture_opened'
  | 'meeting_synthesis_opened'
  // WorkObject lifecycle (Phase 1)
  | 'meeting_uid_created'
  | 'meeting_uid_resolved'
  | 'meeting_uid_rescheduled'
  | 'work_object_created'
  | 'work_object_updated'
  | 'work_object_deleted'
  | 'work_object_restored'
  | 'flag_toggled';

/**
 * Semantic events are kept forever.
 * Noise events are compacted after 30 days or 10k records.
 */
export const SEMANTIC_EVENT_TYPES: EventType[] = [
  'mode_switched',
  'capsule_opened',
  'meeting_goal_updated',
  'my3_goal_added',
  'my3_goal_updated',
  'my3_goal_deleted',
  'my3_goal_restored',
  'goal_checked',
  'marker_created',
  'marker_labeled',
  'marker_deleted',
  'synthesis_completed',
  'intent_created',
  'intent_status_changed',
  'thumb_feedback',
  // Session tracking
  'session_opened',
  'session_bounced',
  'session_interacted',
  // Meeting lifecycle
  'meeting_prep_opened',
  'meeting_capture_opened',
  'meeting_synthesis_opened',
  // WorkObject lifecycle
  'meeting_uid_created',
  'meeting_uid_resolved',
  'meeting_uid_rescheduled',
  'work_object_created',
  'work_object_updated',
  'work_object_deleted',
  'work_object_restored',
  'flag_toggled',
];

export const NOISE_EVENT_TYPES: EventType[] = [
  'plan_rendered',
  'user_interaction', // High frequency, compactable
];

export interface EventRecord {
  id: string;
  type: EventType;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface EventFilter {
  types?: EventType[];
  startTime?: number;
  endTime?: number;
  limit?: number;
}

// ============================================
// Intent Ledger Types (§9.2)
// ============================================

export type IntentScope = 'meeting' | 'session';
export type IntentType = 'goal' | 'question' | 'data_need' | 'action' | 'note';
export type IntentStatus = 'open' | 'satisfied' | 'deferred';

export interface IntentItem {
  id: string;
  scope: IntentScope;
  type: IntentType;
  text: string;
  status: IntentStatus;
  meetingId?: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Meeting State Types
// ============================================

export type MarkerType = 'decision' | 'action' | 'risk' | 'question';

export interface StoredMarker {
  id: string;
  type: MarkerType;
  label?: string;
  timestamp: number;
  meetingId: string;
}

export interface StoredMy3Goal {
  id: string;
  text: string;
  achieved: boolean;
  achievedAt?: number;
  /** Soft-delete timestamp (tombstone) */
  deletedAt?: number;
}

export interface MeetingState {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  attendees: string[];
  goal?: string;
  my3Goals: StoredMy3Goal[];
  markers: StoredMarker[];
  /** Monotonic counter for marker IDs (never resets) */
  markerCounter?: number;
  synthesisCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Compaction Types (§9.4)
// ============================================

export interface DailyAggregate {
  id: string; // format: "aggregate-YYYY-MM-DD"
  date: string; // YYYY-MM-DD
  rendersByMode: Record<string, number>;
  overrideCount: number;
  capsuleOpenCount: number;
  totalEvents: number;
}

// ============================================
// Storage API Types
// ============================================

export interface StorageAPI {
  // Events
  logEvent(type: EventType, payload?: Record<string, unknown>): Promise<string>;
  getEvents(filter?: EventFilter): Promise<EventRecord[]>;
  compactEvents(): Promise<{ removed: number; aggregated: number }>;

  // Meetings
  getMeeting(id: string): Promise<MeetingState | null>;
  getAllMeetings(): Promise<MeetingState[]>;
  saveMeeting(meeting: MeetingState): Promise<void>;
  deleteMeeting(id: string): Promise<void>;

  // Intents
  getIntents(filter?: { scope?: IntentScope; status?: IntentStatus }): Promise<IntentItem[]>;
  saveIntent(intent: IntentItem): Promise<void>;
  updateIntentStatus(id: string, status: IntentStatus): Promise<void>;
  deleteIntent(id: string): Promise<void>;

  // Aggregates
  getAggregates(startDate?: string, endDate?: string): Promise<DailyAggregate[]>;
}

// ============================================
// Database Schema
// ============================================

export const DB_NAME = 'agentic-interface';
export const DB_VERSION = 3; // Bumped for tombstone index

export const STORE_NAMES = {
  events: 'events',
  meetings: 'meetings',
  intents: 'intents',
  aggregates: 'aggregates',
  // WorkObjects stores (Phase 1)
  meetingUidMappings: 'meetingUidMappings',
  meetingMetadata: 'meetingMetadata',
  // WorkObjects stores (Phase 2 - created as shells)
  workObjects: 'workObjects',
  workObjectFlags: 'workObjectFlags',
  workLinks: 'workLinks',
} as const;

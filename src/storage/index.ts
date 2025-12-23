/**
 * Storage Module
 *
 * Public exports for the persistence layer.
 */

// Types
export type {
  EventType,
  EventRecord,
  EventFilter,
  IntentScope,
  IntentType,
  IntentStatus,
  IntentItem,
  MarkerType,
  StoredMarker,
  StoredMy3Goal,
  MeetingState,
  DailyAggregate,
  StorageAPI,
} from './types';

export {
  SEMANTIC_EVENT_TYPES,
  NOISE_EVENT_TYPES,
  DB_NAME,
  DB_VERSION,
  STORE_NAMES,
} from './types';

// Storage API
export { storage } from './storage-api';

// React Hooks
export {
  useEventLogger,
  useEvents,
  useMeeting,
  useMeetings,
  useIntents,
  useCompaction,
} from './hooks';

// Low-level DB access (for testing/debugging)
export { getDB, closeDB } from './db';

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

// WorkObject Types (Phase 1)
export type {
  WorkObjectType,
  WorkObjectSource,
  WorkObjectScope,
  WorkObject,
  MeetingUidMapping,
  MeetingMetadata,
  FlagType,
  WorkObjectFlag,
  LinkType,
  WorkLink,
  ParsedWorkObjectId,
} from './work-object-types';

// WorkObject ID Factory
export {
  generateMeetingUid,
  buildScope,
  getMeetingUidFromScope,
  createWorkObjectId,
  workObjectIds,
  parseWorkObjectId,
  isValidWorkObjectId,
  isSameScope,
  getMeetingUidFromWorkObjectId,
} from './work-object-id';

// Meeting UID API
export {
  getOrCreateMeetingUid,
  getMeetingMapping,
  findMeetingUidByEventId,
  findMeetingUidByICalUid,
  getNextMarkerNumber,
  getMarkerCount,
  getMeetingMetadata,
} from './meeting-uid-api';

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

// WorkObject store operations (for direct access)
export {
  meetingUidMappingsStore,
  meetingMetadataStore,
  workObjectsStore,
  workObjectFlagsStore,
  workLinksStore,
} from './db';

// WorkObject API (soft-delete, linking)
export {
  softDeleteWorkObject,
  restoreWorkObject,
  softDeleteWorkLink,
  createWorkLink,
  getActiveWorkObjects,
  getActiveWorkObjectsByType,
  getTombstonedWorkObjects,
  getTombstonedWorkObjectsOlderThan,
  getActiveWorkLinks,
  getActiveLinksForWorkObject,
  getTombstoneStats as getWorkObjectTombstoneStats,
  LinkValidationError,
} from './work-object-api';

// Tombstone Compaction
export type {
  TombstoneCompactionConfig,
  CompactionResult,
  TombstoneStats,
} from './tombstone-compaction';

export {
  DEFAULT_COMPACTION_CONFIG,
  getTombstoneStats,
  compactTombstones,
  exportAllTombstones,
  downloadBlob,
  generateExportFilename,
} from './tombstone-compaction';

/**
 * Calendar Module
 *
 * Public exports for Google Calendar integration.
 */

// Types
export type {
  CalendarAuth,
  OAuthConfig,
  CalendarEvent,
  Attendee,
  ResponseStatus,
  SnapshotCache,
  CalendarError,
  CalendarErrorType,
  CalendarState,
  CalendarStatus,
} from './types';

export {
  DEFAULT_STALE_MS,
  CRITICAL_STALE_MS,
  GOOGLE_CALENDAR_SCOPE,
  isCalendarError,
  createCalendarError,
} from './types';

// OAuth
export {
  initiateOAuth,
  handleOAuthCallback,
  refreshAccessToken,
  getStoredAuth,
  clearAuth,
  isAuthExpired,
  getValidAuth,
  isAuthenticated,
  signOut,
} from './oauth';

// API
export {
  fetchCalendarEvents,
  fetchCalendarSnapshot,
  getUpcomingEvents,
  getEventById,
} from './api';

// Cache
export {
  isSnapshotStale,
  isSnapshotCriticallyStale,
  getCacheAge,
  clearCache,
  getCache,
  updateCache,
  getCachedEvents,
  refreshSnapshotIfNeeded,
  forceRefreshSnapshot,
  getSnapshotInfo,
} from './cache';

// React Hooks
export {
  useCalendar,
  useCalendarForRules,
  useCurrentMeetingHeader,
  useNextMeetingHeader,
  toRulesEvents,
  meetingToHeaderProps,
} from './use-calendar';

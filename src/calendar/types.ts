/**
 * Calendar Integration Types
 *
 * Type definitions for Google Calendar integration.
 * See spec §11 Calendar Integration (V1)
 */

// ============================================
// Authentication Types
// ============================================

export interface CalendarAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

// ============================================
// Calendar Event Types
// ============================================

export type ResponseStatus = 'accepted' | 'declined' | 'tentative' | 'needsAction';

export interface Attendee {
  email: string;
  name?: string;
  responseStatus: ResponseStatus;
  self?: boolean;
}

export interface CalendarEvent {
  id: string;
  /** iCalUID for stable identity across edits (WorkObjects spec §4.1) */
  iCalUid?: string;
  title: string;
  startTime: number;
  endTime: number;
  attendees: Attendee[];
  location?: string;
  description?: string;
  htmlLink?: string;
  calendarId?: string;
  isAllDay: boolean;
}

// ============================================
// Snapshot Cache Types
// ============================================

export interface SnapshotCache {
  events: CalendarEvent[];
  fetchedAt: number;
  staleAfterMs: number;
}

export const DEFAULT_STALE_MS = 5 * 60 * 1000; // 5 minutes
export const CRITICAL_STALE_MS = 30 * 60 * 1000; // 30 minutes (offline fallback limit)

// ============================================
// Error Types
// ============================================

export type CalendarErrorType =
  | 'auth_required'
  | 'auth_expired'
  | 'network_error'
  | 'rate_limited'
  | 'api_error'
  | 'invalid_response';

export interface CalendarError {
  type: CalendarErrorType;
  message: string;
  retryAfter?: number;
  code?: number;
}

export function isCalendarError(error: unknown): error is CalendarError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error
  );
}

export function createCalendarError(
  type: CalendarErrorType,
  message: string,
  options?: { retryAfter?: number; code?: number }
): CalendarError {
  return {
    type,
    message,
    ...options,
  };
}

// ============================================
// Calendar State Types
// ============================================

export type CalendarStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'error'
  | 'offline';

export interface CalendarState {
  status: CalendarStatus;
  auth: CalendarAuth | null;
  cache: SnapshotCache | null;
  error: CalendarError | null;
  lastRefresh: number | null;
}

export const INITIAL_CALENDAR_STATE: CalendarState = {
  status: 'idle',
  auth: null,
  cache: null,
  error: null,
  lastRefresh: null,
};

// ============================================
// Google API Response Types
// ============================================

export interface GoogleCalendarEvent {
  id: string;
  /** iCalUID for stable identity (more stable than eventId) */
  iCalUID?: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    self?: boolean;
  }>;
  location?: string;
  description?: string;
  htmlLink?: string;
}

export interface GoogleCalendarListResponse {
  kind: string;
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

// ============================================
// Constants
// ============================================

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Storage keys
export const AUTH_STORAGE_KEY = 'agentic_calendar_auth';
export const CACHE_STORAGE_KEY = 'agentic_calendar_cache';
export const PKCE_STORAGE_KEY = 'agentic_oauth_pkce';

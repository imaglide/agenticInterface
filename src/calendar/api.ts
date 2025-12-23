/**
 * Calendar API Client
 *
 * Fetches calendar events from Google Calendar API.
 */

import {
  CalendarAuth,
  CalendarEvent,
  GoogleCalendarEvent,
  GoogleCalendarListResponse,
  GOOGLE_CALENDAR_API_BASE,
  createCalendarError,
  CalendarError,
} from './types';
import { getValidAuth, refreshAccessToken } from './oauth';

// ============================================
// API Client
// ============================================

/**
 * Make an authenticated request to Google Calendar API.
 */
async function calendarFetch<T>(
  endpoint: string,
  auth: CalendarAuth
): Promise<T> {
  const url = `${GOOGLE_CALENDAR_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // Handle specific error codes
    if (response.status === 401) {
      throw createCalendarError('auth_expired', 'Access token expired');
    }

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      throw createCalendarError('rate_limited', 'Rate limited by Google', {
        retryAfter: retryAfter * 1000,
      });
    }

    const errorText = await response.text();
    throw createCalendarError('api_error', `API error: ${errorText}`, {
      code: response.status,
    });
  }

  return response.json();
}

/**
 * Make an authenticated request with automatic token refresh.
 */
async function calendarFetchWithRetry<T>(
  endpoint: string,
  auth: CalendarAuth
): Promise<{ data: T; auth: CalendarAuth }> {
  try {
    const data = await calendarFetch<T>(endpoint, auth);
    return { data, auth };
  } catch (error) {
    // If auth expired, try to refresh
    if (error instanceof Object && 'type' in error && (error as CalendarError).type === 'auth_expired') {
      const newAuth = await refreshAccessToken(auth);
      const data = await calendarFetch<T>(endpoint, newAuth);
      return { data, auth: newAuth };
    }
    throw error;
  }
}

// ============================================
// Event Fetching
// ============================================

/**
 * Parse Google Calendar event to our CalendarEvent type.
 */
function parseGoogleEvent(event: GoogleCalendarEvent): CalendarEvent {
  // Handle all-day events vs timed events
  const isAllDay = !event.start.dateTime;

  let startTime: number;
  let endTime: number;

  if (isAllDay) {
    // All-day events use date strings (YYYY-MM-DD)
    startTime = new Date(event.start.date!).getTime();
    endTime = new Date(event.end.date!).getTime();
  } else {
    // Timed events use dateTime strings
    startTime = new Date(event.start.dateTime!).getTime();
    endTime = new Date(event.end.dateTime!).getTime();
  }

  return {
    id: event.id,
    title: event.summary || '(No title)',
    startTime,
    endTime,
    attendees: (event.attendees || []).map((a) => ({
      email: a.email,
      name: a.displayName,
      responseStatus: (a.responseStatus as CalendarEvent['attendees'][0]['responseStatus']) || 'needsAction',
      self: a.self,
    })),
    location: event.location,
    description: event.description,
    htmlLink: event.htmlLink,
    isAllDay,
  };
}

/**
 * Fetch calendar events for a time range.
 *
 * @param auth - Calendar authentication
 * @param timeMin - Start of range (default: start of today)
 * @param timeMax - End of range (default: 24 hours from now)
 */
export async function fetchCalendarEvents(
  auth: CalendarAuth,
  timeMin?: Date,
  timeMax?: Date
): Promise<{ events: CalendarEvent[]; auth: CalendarAuth }> {
  // Default time range: today + 24 hours
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const min = timeMin || startOfToday;
  const max = timeMax || new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: min.toISOString(),
    timeMax: max.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const endpoint = `/calendars/primary/events?${params.toString()}`;

  const { data, auth: updatedAuth } = await calendarFetchWithRetry<GoogleCalendarListResponse>(
    endpoint,
    auth
  );

  // Filter out all-day events for now (they don't have specific times)
  // and parse remaining events
  const events = data.items
    .map(parseGoogleEvent)
    .filter((e) => !e.isAllDay);

  return { events, auth: updatedAuth };
}

/**
 * Fetch calendar snapshot (today + 24 hours).
 * This is the main entry point for getting calendar data.
 */
export async function fetchCalendarSnapshot(): Promise<CalendarEvent[]> {
  const auth = await getValidAuth();

  if (!auth) {
    throw createCalendarError('auth_required', 'Not authenticated');
  }

  try {
    const { events } = await fetchCalendarEvents(auth);
    return events;
  } catch (error) {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw createCalendarError('network_error', 'Unable to connect to Google Calendar');
    }
    throw error;
  }
}

/**
 * Get upcoming events (next N hours).
 */
export async function getUpcomingEvents(
  hours: number = 4
): Promise<CalendarEvent[]> {
  const now = new Date();
  const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const auth = await getValidAuth();
  if (!auth) {
    throw createCalendarError('auth_required', 'Not authenticated');
  }

  const { events } = await fetchCalendarEvents(auth, now, futureTime);
  return events;
}

/**
 * Get events for a specific meeting ID.
 */
export async function getEventById(eventId: string): Promise<CalendarEvent | null> {
  const auth = await getValidAuth();
  if (!auth) {
    throw createCalendarError('auth_required', 'Not authenticated');
  }

  try {
    const { data } = await calendarFetchWithRetry<GoogleCalendarEvent>(
      `/calendars/primary/events/${eventId}`,
      auth
    );
    return parseGoogleEvent(data);
  } catch (error) {
    if (error instanceof Object && 'code' in error && (error as CalendarError).code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Calendar React Hook
 *
 * Provides calendar data and authentication state to React components.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarEvent,
  CalendarState,
  CalendarError,
  INITIAL_CALENDAR_STATE,
  isCalendarError,
} from './types';
import {
  isAuthenticated,
  getStoredAuth,
  initiateOAuth,
  signOut as oauthSignOut,
} from './oauth';
import {
  refreshSnapshotIfNeeded,
  forceRefreshSnapshot,
  getSnapshotInfo,
  getCachedEvents,
  clearCache,
  SnapshotInfo,
} from './cache';
import { CalendarEvent as RulesCalendarEvent } from '@/rules';

// ============================================
// Calendar Hook
// ============================================

export interface UseCalendarResult {
  // State
  events: CalendarEvent[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: CalendarError | null;
  snapshotInfo: SnapshotInfo;

  // Actions
  signIn: () => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

/**
 * Main calendar hook for components.
 */
export function useCalendar(): UseCalendarResult {
  const [state, setState] = useState<CalendarState>(INITIAL_CALENDAR_STATE);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshotInfo, setSnapshotInfo] = useState<SnapshotInfo>(getSnapshotInfo());

  // Check authentication on mount
  useEffect(() => {
    const auth = getStoredAuth();

    if (auth) {
      setState((s) => ({ ...s, status: 'authenticated', auth }));

      // Try to load cached events immediately
      const cached = getCachedEvents();
      if (cached) {
        setEvents(cached);
      }
    }

    setSnapshotInfo(getSnapshotInfo());
  }, []);

  // Refresh events
  const refresh = useCallback(async () => {
    if (!isAuthenticated()) {
      return;
    }

    setIsLoading(true);
    setState((s) => ({ ...s, error: null }));

    try {
      const result = await refreshSnapshotIfNeeded();
      setEvents(result.events);
      setState((s) => ({
        ...s,
        status: 'authenticated',
        lastRefresh: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to refresh calendar:', error);

      if (isCalendarError(error)) {
        setState((s) => ({ ...s, error, status: 'error' }));

        // If auth error, clear auth state
        if (error.type === 'auth_required' || error.type === 'auth_expired') {
          setState((s) => ({ ...s, auth: null, status: 'idle' }));
        }
      } else {
        setState((s) => ({
          ...s,
          error: { type: 'network_error', message: 'Failed to fetch calendar' },
          status: 'offline',
        }));
      }
    } finally {
      setIsLoading(false);
      setSnapshotInfo(getSnapshotInfo());
    }
  }, []);

  // Force refresh (bypass cache)
  const forceRefresh = useCallback(async () => {
    if (!isAuthenticated()) {
      return;
    }

    setIsLoading(true);
    setState((s) => ({ ...s, error: null }));

    try {
      const newEvents = await forceRefreshSnapshot();
      setEvents(newEvents);
      setState((s) => ({
        ...s,
        status: 'authenticated',
        lastRefresh: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to force refresh calendar:', error);

      if (isCalendarError(error)) {
        setState((s) => ({ ...s, error, status: 'error' }));
      }
    } finally {
      setIsLoading(false);
      setSnapshotInfo(getSnapshotInfo());
    }
  }, []);

  // Sign in
  const signIn = useCallback(async () => {
    try {
      await initiateOAuth();
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      if (isCalendarError(error)) {
        setState((s) => ({ ...s, error }));
      }
    }
  }, []);

  // Sign out
  const signOut = useCallback(() => {
    oauthSignOut();
    clearCache();
    setEvents([]);
    setState(INITIAL_CALENDAR_STATE);
    setSnapshotInfo(getSnapshotInfo());
  }, []);

  // Auto-refresh on mount if authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      refresh();
    }
  }, [refresh]);

  return {
    events,
    isAuthenticated: state.status === 'authenticated',
    isLoading,
    error: state.error,
    snapshotInfo,
    signIn,
    signOut,
    refresh,
    forceRefresh,
  };
}

// ============================================
// Rules Engine Integration
// ============================================

/**
 * Convert calendar events to rules engine format.
 */
export function toRulesEvents(events: CalendarEvent[]): RulesCalendarEvent[] {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    attendees: event.attendees.map((a) => a.name || a.email),
  }));
}

/**
 * Hook that provides calendar events in rules engine format.
 */
export function useCalendarForRules(): {
  events: RulesCalendarEvent[];
  isReady: boolean;
  refresh: () => Promise<void>;
} {
  const { events, isAuthenticated, isLoading, refresh } = useCalendar();

  return {
    events: toRulesEvents(events),
    isReady: isAuthenticated && !isLoading,
    refresh,
  };
}

// ============================================
// Meeting Header Props
// ============================================

export interface MeetingHeaderProps {
  title: string;
  startTime: number;
  endTime: number;
  attendees: string[];
  location?: string;
}

/**
 * Convert calendar event to MeetingHeader props.
 */
export function meetingToHeaderProps(event: CalendarEvent): MeetingHeaderProps {
  return {
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    attendees: event.attendees.map((a) => a.name || a.email),
    location: event.location,
  };
}

/**
 * Get current meeting header props (if in a meeting).
 */
export function useCurrentMeetingHeader(): MeetingHeaderProps | null {
  const { events } = useCalendar();
  const now = Date.now();

  // Find current meeting
  const currentMeeting = events.find(
    (e) => e.startTime <= now && e.endTime >= now
  );

  if (!currentMeeting) {
    return null;
  }

  return meetingToHeaderProps(currentMeeting);
}

/**
 * Get next meeting header props (if upcoming).
 */
export function useNextMeetingHeader(): MeetingHeaderProps | null {
  const { events } = useCalendar();
  const now = Date.now();

  // Find next upcoming meeting
  const nextMeeting = events
    .filter((e) => e.startTime > now)
    .sort((a, b) => a.startTime - b.startTime)[0];

  if (!nextMeeting) {
    return null;
  }

  return meetingToHeaderProps(nextMeeting);
}

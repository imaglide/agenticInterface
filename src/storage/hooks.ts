/**
 * Storage Hooks
 *
 * React hooks for using the storage API in components.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage } from './storage-api';
import {
  EventRecord,
  EventFilter,
  MeetingState,
  IntentItem,
  IntentScope,
  IntentStatus,
  EventType,
} from './types';

// ============================================
// Event Hooks
// ============================================

/**
 * Hook for logging events.
 */
export function useEventLogger() {
  const log = useCallback(
    async (type: EventType, payload?: Record<string, unknown>) => {
      return storage.logEvent(type, payload);
    },
    []
  );

  return { log };
}

/**
 * Hook for fetching events.
 * Note: Pass a memoized filter object to prevent infinite re-renders.
 */
export function useEvents(filter?: EventFilter) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Serialize filter to use as stable dependency
  const filterKey = JSON.stringify(filter);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await storage.getEvents(filter);
      setEvents(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { events, loading, error, refresh };
}

// ============================================
// Meeting Hooks
// ============================================

/**
 * Hook for fetching a single meeting.
 */
export function useMeeting(meetingId: string | null) {
  const [meeting, setMeeting] = useState<MeetingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!meetingId) {
      setMeeting(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await storage.getMeeting(meetingId);
      setMeeting(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Meeting operations
  const updateGoal = useCallback(
    async (goal: string) => {
      if (!meetingId) return;
      await storage.updateMeetingGoal(meetingId, goal);
      await refresh();
    },
    [meetingId, refresh]
  );

  const addGoal = useCallback(
    async (text: string) => {
      if (!meetingId) return;
      await storage.addMy3Goal(meetingId, text);
      await refresh();
    },
    [meetingId, refresh]
  );

  const updateMy3Goal = useCallback(
    async (goalId: string, text: string) => {
      if (!meetingId) return;
      await storage.updateMy3Goal(meetingId, goalId, text);
      await refresh();
    },
    [meetingId, refresh]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      if (!meetingId) return;
      await storage.deleteMy3Goal(meetingId, goalId);
      await refresh();
    },
    [meetingId, refresh]
  );

  const toggleGoal = useCallback(
    async (goalId: string) => {
      if (!meetingId) return;
      await storage.toggleMy3Goal(meetingId, goalId);
      await refresh();
    },
    [meetingId, refresh]
  );

  const addMarker = useCallback(
    async (type: 'decision' | 'action' | 'risk' | 'question', label?: string) => {
      if (!meetingId) return;
      await storage.addMarker(meetingId, type, label);
      await refresh();
    },
    [meetingId, refresh]
  );

  const updateMarkerLabel = useCallback(
    async (markerId: string, label: string) => {
      if (!meetingId) return;
      await storage.updateMarkerLabel(meetingId, markerId, label);
      await refresh();
    },
    [meetingId, refresh]
  );

  const completeSynthesis = useCallback(async () => {
    if (!meetingId) return;
    await storage.completeSynthesis(meetingId);
    await refresh();
  }, [meetingId, refresh]);

  return {
    meeting,
    loading,
    error,
    refresh,
    updateGoal,
    addGoal,
    updateMy3Goal,
    deleteGoal,
    toggleGoal,
    addMarker,
    updateMarkerLabel,
    completeSynthesis,
  };
}

/**
 * Hook for fetching all meetings.
 */
export function useMeetings() {
  const [meetings, setMeetings] = useState<MeetingState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await storage.getAllMeetings();
      setMeetings(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createMeeting = useCallback(
    async (meeting: Omit<MeetingState, 'createdAt' | 'updatedAt'>) => {
      await storage.saveMeeting(meeting as MeetingState);
      await refresh();
    },
    [refresh]
  );

  const deleteMeeting = useCallback(
    async (id: string) => {
      await storage.deleteMeeting(id);
      await refresh();
    },
    [refresh]
  );

  return { meetings, loading, error, refresh, createMeeting, deleteMeeting };
}

// ============================================
// Intent Hooks
// ============================================

/**
 * Hook for fetching intents.
 * Note: Pass a memoized filter object to prevent infinite re-renders.
 */
export function useIntents(filter?: { scope?: IntentScope; status?: IntentStatus }) {
  const [intents, setIntents] = useState<IntentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Serialize filter to use as stable dependency
  const filterKey = JSON.stringify(filter);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await storage.getIntents(filter);
      setIntents(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createIntent = useCallback(
    async (intent: Omit<IntentItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      await storage.saveIntent(intent);
      await refresh();
    },
    [refresh]
  );

  const updateStatus = useCallback(
    async (id: string, status: IntentStatus) => {
      await storage.updateIntentStatus(id, status);
      await refresh();
    },
    [refresh]
  );

  const deleteIntent = useCallback(
    async (id: string) => {
      await storage.deleteIntent(id);
      await refresh();
    },
    [refresh]
  );

  return { intents, loading, error, refresh, createIntent, updateStatus, deleteIntent };
}

// ============================================
// Compaction Hook
// ============================================

/**
 * Hook for running event compaction.
 */
export function useCompaction() {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{ removed: number; aggregated: number } | null>(
    null
  );
  const [error, setError] = useState<Error | null>(null);

  const compact = useCallback(async () => {
    try {
      setRunning(true);
      setError(null);
      const result = await storage.compactEvents();
      setLastResult(result);
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setRunning(false);
    }
  }, []);

  return { compact, running, lastResult, error };
}

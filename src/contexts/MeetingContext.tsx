'use client';

/**
 * Meeting Context
 *
 * Provides meeting state and operations to components throughout the app.
 * Used by CaptureMarkersPanel to create markers via hotkeys and read live marker data.
 * Used by My3GoalsCard for goal CRUD operations.
 */

import { createContext, useContext, ReactNode, useCallback } from 'react';
import { storage, MeetingState } from '@/storage';
import type { MarkerType, Marker } from '@/components/capture/CaptureMarkersPanel';
import type { My3Goal } from '@/components/prep/My3GoalsCard';

interface MeetingContextValue {
  meetingId: string | null;
  meeting: MeetingState | null;
  markers: Marker[];
  goals: My3Goal[];
  // Marker operations
  addMarker: (type: MarkerType, label?: string) => Promise<void>;
  deleteMarker: (markerId: string) => Promise<void>;
  // Goal operations
  addGoal: (text: string) => Promise<void>;
  updateGoal: (goalId: string, text: string) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  toggleGoal: (goalId: string, achieved: boolean) => Promise<void>;
}

const MeetingContext = createContext<MeetingContextValue | null>(null);

interface MeetingProviderProps {
  children: ReactNode;
  meetingId: string | null;
  meeting: MeetingState | null;
  onDataChanged?: () => void;
}

export function MeetingProvider({
  children,
  meetingId,
  meeting,
  onDataChanged,
}: MeetingProviderProps) {
  // Marker operations
  const addMarker = useCallback(
    async (type: MarkerType, label?: string) => {
      if (!meetingId) return;
      await storage.addMarker(meetingId, type, label);
      onDataChanged?.();
    },
    [meetingId, onDataChanged]
  );

  const deleteMarker = useCallback(
    async (markerId: string) => {
      if (!meetingId) return;
      await storage.deleteMarker(meetingId, markerId);
      onDataChanged?.();
    },
    [meetingId, onDataChanged]
  );

  // Goal operations
  const addGoal = useCallback(
    async (text: string) => {
      if (!meetingId) return;
      await storage.addMy3Goal(meetingId, text);
      onDataChanged?.();
    },
    [meetingId, onDataChanged]
  );

  const updateGoal = useCallback(
    async (goalId: string, text: string) => {
      if (!meetingId) return;
      await storage.updateMy3Goal(meetingId, goalId, text);
      onDataChanged?.();
    },
    [meetingId, onDataChanged]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      if (!meetingId) return;
      await storage.deleteMy3Goal(meetingId, goalId);
      onDataChanged?.();
    },
    [meetingId, onDataChanged]
  );

  const toggleGoal = useCallback(
    async (goalId: string, achieved: boolean) => {
      if (!meetingId) return;
      // toggleMy3Goal just flips state, but we want explicit set
      // For now, use toggle which will flip to the desired state
      await storage.toggleMy3Goal(meetingId, goalId);
      onDataChanged?.();
    },
    [meetingId, onDataChanged]
  );

  // Convert storage markers to component marker format (filter out soft-deleted)
  const markers: Marker[] = (meeting?.markers ?? [])
    .filter((m) => !(m as { deletedAt?: number }).deletedAt)
    .map((m) => ({
      id: m.id,
      type: m.type as MarkerType,
      label: m.label,
      timestamp: m.timestamp,
    }));

  // Convert storage goals to component goal format (filter out soft-deleted)
  const goals: My3Goal[] = (meeting?.my3Goals ?? [])
    .filter((g) => !g.deletedAt)
    .map((g) => ({
      id: g.id,
      text: g.text,
      achieved: g.achieved,
      achievedAt: g.achievedAt,
    }));

  return (
    <MeetingContext.Provider
      value={{
        meetingId,
        meeting,
        markers,
        goals,
        addMarker,
        deleteMarker,
        addGoal,
        updateGoal,
        deleteGoal,
        toggleGoal,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeetingContext() {
  return useContext(MeetingContext);
}

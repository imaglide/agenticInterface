'use client';

/**
 * Meeting Context
 *
 * Provides meeting state and operations to components throughout the app.
 * Used by CaptureMarkersPanel to create markers via hotkeys and read live marker data.
 */

import { createContext, useContext, ReactNode, useCallback } from 'react';
import { storage, MeetingState } from '@/storage';
import type { MarkerType, Marker } from '@/components/capture/CaptureMarkersPanel';

interface MeetingContextValue {
  meetingId: string | null;
  meeting: MeetingState | null;
  markers: Marker[];
  addMarker: (type: MarkerType, label?: string) => Promise<void>;
}

const MeetingContext = createContext<MeetingContextValue | null>(null);

interface MeetingProviderProps {
  children: ReactNode;
  meetingId: string | null;
  meeting: MeetingState | null;
  onMarkerAdded?: () => void;
}

export function MeetingProvider({
  children,
  meetingId,
  meeting,
  onMarkerAdded,
}: MeetingProviderProps) {
  const addMarker = useCallback(
    async (type: MarkerType, label?: string) => {
      if (!meetingId) return;
      await storage.addMarker(meetingId, type, label);
      onMarkerAdded?.();
    },
    [meetingId, onMarkerAdded]
  );

  // Convert storage markers to component marker format
  const markers: Marker[] = (meeting?.markers ?? []).map((m) => ({
    id: m.id,
    type: m.type as MarkerType,
    label: m.label,
    timestamp: m.timestamp,
  }));

  return (
    <MeetingContext.Provider value={{ meetingId, meeting, markers, addMarker }}>
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeetingContext() {
  return useContext(MeetingContext);
}

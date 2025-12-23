'use client';

import { useEffect, useRef, useCallback } from 'react';
import { storage } from '@/storage';
import { Mode } from '@/types/ui-plan';

const BOUNCE_TIMEOUT_MS = 20000; // 20 seconds

/**
 * Session tracking hook.
 * Tracks session opens, bounces, and interactions.
 *
 * Bounce = user opens app then leaves within 20s without interaction.
 */
export function useSessionTracking(currentMode: Mode, meetingId: string | null) {
  const sessionIdRef = useRef<string | null>(null);
  const hasInteractedRef = useRef(false);
  const bounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start session on mount
  useEffect(() => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    sessionIdRef.current = sessionId;
    hasInteractedRef.current = false;

    // Log session opened
    storage.logEvent('session_opened', {
      sessionId,
      mode: currentMode,
      meetingId,
      timestamp: Date.now(),
    });

    // Start bounce timer
    bounceTimeoutRef.current = setTimeout(() => {
      if (!hasInteractedRef.current) {
        storage.logEvent('session_bounced', {
          sessionId,
          mode: currentMode,
          meetingId,
          bounceTimeMs: BOUNCE_TIMEOUT_MS,
        });
      }
    }, BOUNCE_TIMEOUT_MS);

    // Cleanup on unmount
    return () => {
      if (bounceTimeoutRef.current) {
        clearTimeout(bounceTimeoutRef.current);
      }
    };
  }, []); // Only run once on mount

  // Track mode changes for meeting lifecycle events
  useEffect(() => {
    if (!sessionIdRef.current) return;

    const sessionId = sessionIdRef.current;

    // Log meeting lifecycle events based on mode
    if (currentMode === 'meeting_prep' && meetingId) {
      storage.logEvent('meeting_prep_opened', {
        sessionId,
        meetingId,
      });
    } else if (currentMode === 'meeting_capture' && meetingId) {
      storage.logEvent('meeting_capture_opened', {
        sessionId,
        meetingId,
      });
    } else if (currentMode === 'meeting_synthesis_min' && meetingId) {
      storage.logEvent('meeting_synthesis_opened', {
        sessionId,
        meetingId,
      });
    }
  }, [currentMode, meetingId]);

  // Record interaction
  const recordInteraction = useCallback((interactionType: string) => {
    if (!sessionIdRef.current) return;

    const wasFirstInteraction = !hasInteractedRef.current;
    hasInteractedRef.current = true;

    // Clear bounce timeout on first interaction
    if (wasFirstInteraction && bounceTimeoutRef.current) {
      clearTimeout(bounceTimeoutRef.current);
      bounceTimeoutRef.current = null;

      // Log that session was interacted (not bounced)
      storage.logEvent('session_interacted', {
        sessionId: sessionIdRef.current,
        mode: currentMode,
        meetingId,
        firstInteractionType: interactionType,
        timeToInteractMs: Date.now() - parseInt(sessionIdRef.current.split('-')[1]),
      });
    }

    // Log the interaction itself (debounced in production)
    storage.logEvent('user_interaction', {
      sessionId: sessionIdRef.current,
      type: interactionType,
      mode: currentMode,
    });
  }, [currentMode, meetingId]);

  return {
    sessionId: sessionIdRef.current,
    recordInteraction,
  };
}

/**
 * Interaction types for tracking
 */
export const INTERACTION_TYPES = {
  CLICK: 'click',
  INPUT: 'input',
  SCROLL: 'scroll',
  GOAL_ADD: 'goal_add',
  GOAL_CHECK: 'goal_check',
  MARKER_ADD: 'marker_add',
  CAPSULE_OPEN: 'capsule_open',
  MODE_SWITCH: 'mode_switch',
} as const;

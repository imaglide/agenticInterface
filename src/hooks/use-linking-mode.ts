'use client';

/**
 * Linking Mode State Machine
 *
 * Manages the UI state for connecting WorkObjects with links.
 * See parking lot item: "Linking Mode Timeout (10s may be too short)"
 *
 * The hook provides:
 * - State machine: idle → selecting_source → selecting_target → idle
 * - Configurable timeout with visual countdown
 * - Activity tracking to reset timeout on user interaction
 * - Option to require explicit cancel (no timeout)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { LinkType } from '@/storage/work-object-types';

// ============================================
// Types
// ============================================

export interface LinkingModeConfig {
  /** Milliseconds of inactivity before auto-cancel (default: 30000) */
  inactivityTimeoutMs: number;
  /** When true, timeout is disabled and user must explicitly cancel (default: true) */
  requireExplicitCancel: boolean;
  /** Milliseconds before timeout to show warning (default: 5000) */
  warningThresholdMs: number;
}

export type LinkingModeState = 'idle' | 'selecting_source' | 'selecting_target';

export interface LinkingModeStatus {
  /** Current state of the linking mode */
  state: LinkingModeState;
  /** Source WorkObject ID (set after selecting source) */
  sourceId: string | null;
  /** Selected link type */
  linkType: LinkType | null;
  /** Seconds remaining before timeout (null if timeout disabled) */
  timeoutSecondsRemaining: number | null;
  /** Whether timeout warning should be shown */
  showTimeoutWarning: boolean;
  /** Whether linking mode is active (not idle) */
  isActive: boolean;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_LINKING_CONFIG: LinkingModeConfig = {
  inactivityTimeoutMs: 30000, // 30 seconds (increased from original 10s concern)
  requireExplicitCancel: true, // Addresses parking lot concern
  warningThresholdMs: 5000, // Show warning at 5 seconds remaining
};

// ============================================
// Hook Implementation
// ============================================

export function useLinkingMode(
  config: Partial<LinkingModeConfig> = {}
): {
  status: LinkingModeStatus;
  startLinking: (linkType: LinkType) => void;
  selectSource: (workObjectId: string) => void;
  selectTarget: (workObjectId: string) => { sourceId: string; targetId: string; linkType: LinkType } | null;
  cancel: () => void;
  resetTimeout: () => void;
} {
  const { inactivityTimeoutMs, requireExplicitCancel, warningThresholdMs } = {
    ...DEFAULT_LINKING_CONFIG,
    ...config,
  };

  // State
  const [state, setState] = useState<LinkingModeState>('idle');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<LinkType | null>(null);
  const [timeoutSecondsRemaining, setTimeoutSecondsRemaining] = useState<number | null>(null);

  // Refs for timeout management
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // ============================================
  // Timeout Management
  // ============================================

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setTimeoutSecondsRemaining(null);
  }, []);

  const startTimeout = useCallback(() => {
    if (requireExplicitCancel) {
      // Timeout disabled - user must explicitly cancel
      setTimeoutSecondsRemaining(null);
      return;
    }

    clearTimers();
    lastActivityRef.current = Date.now();

    // Set main timeout
    timeoutRef.current = setTimeout(() => {
      // Auto-cancel on timeout
      setState('idle');
      setSourceId(null);
      setLinkType(null);
      clearTimers();
    }, inactivityTimeoutMs);

    // Start countdown interval (updates every second)
    setTimeoutSecondsRemaining(Math.ceil(inactivityTimeoutMs / 1000));
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.ceil((inactivityTimeoutMs - elapsed) / 1000));
      setTimeoutSecondsRemaining(remaining);
    }, 1000);
  }, [requireExplicitCancel, inactivityTimeoutMs, clearTimers]);

  const resetTimeout = useCallback(() => {
    if (state !== 'idle' && !requireExplicitCancel) {
      startTimeout();
    }
  }, [state, requireExplicitCancel, startTimeout]);

  // ============================================
  // State Transitions
  // ============================================

  const startLinking = useCallback((type: LinkType) => {
    setLinkType(type);
    setSourceId(null);
    setState('selecting_source');
    startTimeout();
  }, [startTimeout]);

  const selectSource = useCallback((workObjectId: string) => {
    if (state !== 'selecting_source') {
      console.warn('[LinkingMode] selectSource called in wrong state:', state);
      return;
    }
    setSourceId(workObjectId);
    setState('selecting_target');
    resetTimeout();
  }, [state, resetTimeout]);

  const selectTarget = useCallback((workObjectId: string): { sourceId: string; targetId: string; linkType: LinkType } | null => {
    if (state !== 'selecting_target' || !sourceId || !linkType) {
      console.warn('[LinkingMode] selectTarget called in wrong state:', state);
      return null;
    }

    // Capture result before resetting state
    const result = {
      sourceId,
      targetId: workObjectId,
      linkType,
    };

    // Reset to idle
    setState('idle');
    setSourceId(null);
    setLinkType(null);
    clearTimers();

    return result;
  }, [state, sourceId, linkType, clearTimers]);

  const cancel = useCallback(() => {
    setState('idle');
    setSourceId(null);
    setLinkType(null);
    clearTimers();
  }, [clearTimers]);

  // ============================================
  // Cleanup on Unmount
  // ============================================

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // ============================================
  // Computed Status
  // ============================================

  const showTimeoutWarning =
    timeoutSecondsRemaining !== null &&
    timeoutSecondsRemaining <= warningThresholdMs / 1000 &&
    timeoutSecondsRemaining > 0;

  const status: LinkingModeStatus = {
    state,
    sourceId,
    linkType,
    timeoutSecondsRemaining,
    showTimeoutWarning,
    isActive: state !== 'idle',
  };

  return {
    status,
    startLinking,
    selectSource,
    selectTarget,
    cancel,
    resetTimeout,
  };
}

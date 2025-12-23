/**
 * Stability Enforcement
 *
 * Implements safe boundary rules for mode switches.
 * Prevents jarring auto-switches and protects user focus.
 *
 * See spec §4.3 Safe Boundaries, §6.3 Stability Rules
 */

import { Mode } from '@/types/ui-plan';
import {
  StabilityState,
  SwitchTrigger,
  ALLOWED_TRIGGERS,
  BLOCKED_TRIGGERS,
  DEFAULT_TIMING_CONFIG,
} from './types';

/**
 * Result of a switch check.
 */
export interface SwitchCheckResult {
  allowed: boolean;
  reason: string;
  blockedBy?: 'input_focus' | 'minimum_hold' | 'blocked_trigger';
}

/**
 * Check if an auto-switch is allowed.
 *
 * Rules:
 * 1. Trigger must be in allowed list
 * 2. User must not be focused on an input
 * 3. Minimum hold time must have elapsed since last switch
 */
export function canAutoSwitch(
  proposedMode: Mode,
  currentState: StabilityState,
  trigger: SwitchTrigger
): SwitchCheckResult {
  const now = Date.now();

  // Rule 1: Check trigger type
  if (BLOCKED_TRIGGERS.includes(trigger)) {
    return {
      allowed: false,
      reason: `Trigger "${trigger}" is not allowed for auto-switches`,
      blockedBy: 'blocked_trigger',
    };
  }

  if (!ALLOWED_TRIGGERS.includes(trigger)) {
    return {
      allowed: false,
      reason: `Unknown trigger "${trigger}"`,
      blockedBy: 'blocked_trigger',
    };
  }

  // Rule 2: Mid-edit lockout
  if (currentState.isInputFocused) {
    return {
      allowed: false,
      reason: 'Cannot switch while user is typing',
      blockedBy: 'input_focus',
    };
  }

  // Rule 3: Minimum hold time
  const timeSinceLastSwitch = now - currentState.lastSwitchTime;
  if (timeSinceLastSwitch < currentState.minimumHoldMs) {
    const remainingMs = currentState.minimumHoldMs - timeSinceLastSwitch;
    return {
      allowed: false,
      reason: `Minimum hold time not met (${Math.ceil(remainingMs / 1000)}s remaining)`,
      blockedBy: 'minimum_hold',
    };
  }

  // Same mode - no need to switch
  if (proposedMode === currentState.currentMode) {
    return {
      allowed: false,
      reason: 'Already in this mode',
    };
  }

  // All checks passed
  return {
    allowed: true,
    reason: `Switch allowed via ${trigger}`,
  };
}

/**
 * Create initial stability state.
 */
export function createStabilityState(
  currentMode: Mode,
  planId: string,
  minimumHoldMs: number = DEFAULT_TIMING_CONFIG.minimumHoldMs
): StabilityState {
  return {
    currentMode,
    currentPlanId: planId,
    lastSwitchTime: Date.now(),
    isInputFocused: false,
    minimumHoldMs,
  };
}

/**
 * Update stability state after a switch.
 */
export function afterSwitch(
  state: StabilityState,
  newMode: Mode,
  newPlanId: string
): StabilityState {
  return {
    ...state,
    currentMode: newMode,
    currentPlanId: newPlanId,
    lastSwitchTime: Date.now(),
  };
}

/**
 * Update input focus state.
 */
export function setInputFocus(
  state: StabilityState,
  isFocused: boolean
): StabilityState {
  return {
    ...state,
    isInputFocused: isFocused,
  };
}

/**
 * Check if the trigger is user-initiated.
 */
export function isUserInitiated(trigger: SwitchTrigger): boolean {
  return trigger === 'explicit_user_action';
}

/**
 * Check if the trigger is from a meeting boundary change.
 */
export function isMeetingBoundary(trigger: SwitchTrigger): boolean {
  return trigger === 'meeting_boundary_change';
}

/**
 * Get human-readable description of why a switch was blocked.
 */
export function getBlockedReasonMessage(result: SwitchCheckResult): string {
  if (result.allowed) {
    return '';
  }

  switch (result.blockedBy) {
    case 'input_focus':
      return 'Waiting for you to finish typing...';
    case 'minimum_hold':
      return 'Briefly holding current view...';
    case 'blocked_trigger':
      return 'This type of change is not allowed';
    default:
      return result.reason;
  }
}

/**
 * Create a stability hook for React components.
 * Tracks input focus across the app.
 */
export function createFocusTracker(): {
  onFocus: () => void;
  onBlur: () => void;
  isFocused: () => boolean;
} {
  let focused = false;

  return {
    onFocus: () => {
      focused = true;
    },
    onBlur: () => {
      focused = false;
    },
    isFocused: () => focused,
  };
}

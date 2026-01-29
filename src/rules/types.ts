/**
 * Rules Engine Types
 *
 * Type definitions for the mode selection and decision engine.
 * See spec §4, §6, §7.
 */

import { Mode, Confidence, UIPlan, DecisionCapsule } from '@/types/ui-plan';

// ============================================
// Calendar Types
// ============================================

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  attendees: string[];
}

// ============================================
// Timing Configuration (§4.1)
// ============================================

export interface TimingConfig {
  prepWindowMinutes: number;      // T-45 default
  synthesisWindowMinutes: number; // 60 min default
  meetingGraceMinutes: number;    // grace for start/end
  minimumHoldMs: number;          // min time before auto-switch
}

export const DEFAULT_TIMING_CONFIG: TimingConfig = {
  prepWindowMinutes: 45,
  synthesisWindowMinutes: 60,
  meetingGraceMinutes: 2,
  minimumHoldMs: 5000, // 5 seconds minimum hold
};

// ============================================
// Meeting Context
// ============================================

export interface MeetingContext {
  currentMeeting: CalendarEvent | null;  // if live
  nextMeeting: CalendarEvent | null;     // within prep window
  lastMeeting: CalendarEvent | null;     // within synthesis window
  now: number;
}

// ============================================
// Mode Selection Result
// ============================================

export interface ModeSelectionResult {
  mode: Mode;
  confidence: Confidence;
  reason: string;
  trigger: string;
}

// ============================================
// Switch Triggers (§4.3)
// ============================================

export type SwitchTrigger =
  | 'app_open'
  | 'meeting_boundary_change'
  | 'explicit_user_action'
  | 'blur_focus'        // blocked
  | 'idle_timeout'      // blocked
  | 'background_poll'   // blocked
  | 'tab_visibility';   // blocked

export const ALLOWED_TRIGGERS: SwitchTrigger[] = [
  'app_open',
  'meeting_boundary_change',
  'explicit_user_action',
];

export const BLOCKED_TRIGGERS: SwitchTrigger[] = [
  'blur_focus',
  'idle_timeout',
  'background_poll',
  'tab_visibility',
];

// ============================================
// Stability State (§6.3)
// ============================================

export interface StabilityState {
  currentMode: Mode;
  currentPlanId: string;
  lastSwitchTime: number;
  isInputFocused: boolean;
  minimumHoldMs: number;
}

// ============================================
// Adjacency Suggestion (§4.2)
// ============================================

export interface AdjacencySuggestion {
  label: string;
  targetMode: Mode;
  reason: string;
}

// ============================================
// Rules Engine Evaluation Result
// ============================================

export interface EvaluationResult {
  plan: UIPlan;
  capsule: DecisionCapsule;
  shouldSwitch: boolean;
  blockedReason?: string;
  adjacencySuggestion?: AdjacencySuggestion;
}

// ============================================
// Mode Priority (§4.2)
// ============================================

/**
 * Mode priority order: CAPTURE > PREP > SYNTHESIS > NEUTRAL
 * Higher number = higher priority
 */
export const MODE_PRIORITY: Record<Mode, number> = {
  meeting_capture: 4,
  meeting_prep: 3,
  meeting_synthesis_min: 2,
  neutral_intent: 1,
  agentic_work_surface: 0,
};

// ============================================
// Mode Labels for Display
// ============================================

export const MODE_LABELS: Record<Mode, string> = {
  neutral_intent: 'Neutral',
  meeting_prep: 'Meeting Prep',
  meeting_capture: 'Live Capture',
  meeting_synthesis_min: 'Synthesis',
  agentic_work_surface: 'Agentic Workspace',
};

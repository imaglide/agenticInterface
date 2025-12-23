/**
 * Rules Engine Module
 *
 * Public exports for the mode selection and decision engine.
 */

// Types
export type {
  CalendarEvent,
  TimingConfig,
  MeetingContext,
  ModeSelectionResult,
  SwitchTrigger,
  StabilityState,
  AdjacencySuggestion,
  EvaluationResult,
} from './types';

export {
  DEFAULT_TIMING_CONFIG,
  ALLOWED_TRIGGERS,
  BLOCKED_TRIGGERS,
  MODE_PRIORITY,
  MODE_LABELS,
} from './types';

// Context Engine
export {
  computeMeetingContext,
  isMeetingStarting,
  isMeetingEnding,
  getTimeUntilMeeting,
  getTimeSinceMeetingEnded,
  formatDuration,
} from './context-engine';

// Mode Selector
export {
  selectMode,
  getAlternatives,
  getWouldChangeConditions,
  getSignalsUsed,
} from './mode-selector';

// Stability
export {
  canAutoSwitch,
  createStabilityState,
  afterSwitch,
  setInputFocus,
  isUserInitiated,
  isMeetingBoundary,
  getBlockedReasonMessage,
  createFocusTracker,
} from './stability';

// Capsule Generator
export {
  generateCapsule,
  getAdjacencySuggestion,
  getShortExplanation,
  getConfidenceExplanation,
} from './capsule-generator';

// Rules Engine
export {
  RulesEngine,
  getRulesEngine,
  resetRulesEngine,
} from './rules-engine';

// React Hook
export {
  useRulesEngine,
  useFocusTracking,
} from './use-rules-engine';

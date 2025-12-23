/**
 * Capsule Generator
 *
 * Generates Decision Capsules for the "Why this view?" panel.
 * Provides transparency into the mode selection decision.
 *
 * See spec §7 Decision Capsule (Trust Layer)
 */

import { Mode, DecisionCapsule, CapsuleAction, Alternative } from '@/types/ui-plan';
import {
  MeetingContext,
  ModeSelectionResult,
  AdjacencySuggestion,
  MODE_LABELS,
  TimingConfig,
  DEFAULT_TIMING_CONFIG,
} from './types';
import {
  getAlternatives,
  getWouldChangeConditions,
  getSignalsUsed,
} from './mode-selector';

/**
 * Generate a Decision Capsule for the current mode selection.
 */
export function generateCapsule(
  selection: ModeSelectionResult,
  context: MeetingContext,
  config: TimingConfig = DEFAULT_TIMING_CONFIG
): DecisionCapsule {
  const alternatives = getAlternatives(context, selection.mode, config);
  const wouldChangeIf = getWouldChangeConditions(selection.mode, context);
  const signalsUsed = getSignalsUsed(context);
  const actions = generateActions(selection.mode, alternatives);

  return {
    viewLabel: MODE_LABELS[selection.mode],
    confidence: selection.confidence,
    reason: selection.reason,
    signalsUsed,
    alternativesConsidered: alternatives.map((alt) => ({
      mode: alt.mode,
      reason: alt.reason,
    })),
    wouldChangeIf,
    actions,
  };
}

/**
 * Generate available actions for the capsule.
 */
function generateActions(
  currentMode: Mode,
  alternatives: Array<{ mode: Mode; reason: string }>
): CapsuleAction[] {
  const actions: CapsuleAction[] = [];

  // Add switch actions for alternatives
  for (const alt of alternatives) {
    actions.push({
      type: 'switch_view',
      label: `Switch to ${MODE_LABELS[alt.mode]}`,
      target: alt.mode,
    });
  }

  // Add mode-specific actions
  switch (currentMode) {
    case 'neutral_intent':
      actions.push({
        type: 'set_intent',
        label: 'Set an intent for today',
      });
      break;

    case 'meeting_prep':
      if (!alternatives.some((a) => a.mode === 'meeting_synthesis_min')) {
        actions.push({
          type: 'switch_view',
          label: 'Switch to Synthesis',
          target: 'meeting_synthesis_min',
        });
      }
      break;

    case 'meeting_capture':
      // Capture mode typically has fewer actions - focus is on the meeting
      break;

    case 'meeting_synthesis_min':
      if (!alternatives.some((a) => a.mode === 'neutral_intent')) {
        actions.push({
          type: 'switch_view',
          label: 'Done reviewing',
          target: 'neutral_intent',
        });
      }
      break;
  }

  return actions;
}

/**
 * Get adjacency suggestion when prep wins over synthesis.
 *
 * Per spec §4.2: When Prep mode is selected but a meeting recently ended,
 * suggest reviewing the previous meeting's outcomes.
 */
export function getAdjacencySuggestion(
  selectedMode: Mode,
  context: MeetingContext
): AdjacencySuggestion | null {
  // Only suggest when in Prep but there's a recent meeting to review
  if (selectedMode === 'meeting_prep' && context.lastMeeting) {
    return {
      label: 'Review last meeting outcomes',
      targetMode: 'meeting_synthesis_min',
      reason: `"${context.lastMeeting.title}" recently ended. You can review it after prepping.`,
    };
  }

  // Suggest prep when in synthesis but meeting is coming up
  if (selectedMode === 'meeting_synthesis_min' && context.nextMeeting) {
    return {
      label: 'Prep for upcoming meeting',
      targetMode: 'meeting_prep',
      reason: `"${context.nextMeeting.title}" is coming up soon.`,
    };
  }

  return null;
}

/**
 * Get a concise explanation of why this mode was chosen.
 */
export function getShortExplanation(
  mode: Mode,
  context: MeetingContext
): string {
  switch (mode) {
    case 'meeting_capture':
      return context.currentMeeting
        ? `"${context.currentMeeting.title}" is happening now`
        : 'Meeting in progress';

    case 'meeting_prep':
      return context.nextMeeting
        ? `Preparing for "${context.nextMeeting.title}"`
        : 'Upcoming meeting detected';

    case 'meeting_synthesis_min':
      return context.lastMeeting
        ? `Reviewing "${context.lastMeeting.title}"`
        : 'Recent meeting needs review';

    case 'neutral_intent':
      return 'No immediate meetings';

    default:
      return 'Selecting best view';
  }
}

/**
 * Get confidence explanation for display.
 */
export function getConfidenceExplanation(
  selection: ModeSelectionResult
): string {
  switch (selection.confidence) {
    case 'HIGH':
      return 'Strong signal with no competing context';
    case 'MEDIUM':
      return 'Good signal but other options available';
    case 'LOW':
      return 'Weak signal, may want to choose manually';
    default:
      return '';
  }
}

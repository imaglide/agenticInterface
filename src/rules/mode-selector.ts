/**
 * Mode Selector
 *
 * Implements the priority-based mode selection logic.
 * Priority order: CAPTURE > PREP > SYNTHESIS > NEUTRAL
 *
 * See spec §4.2 Mode Priority
 */

import { Mode, Confidence } from '@/types/ui-plan';
import {
  MeetingContext,
  ModeSelectionResult,
  MODE_PRIORITY,
  MODE_LABELS,
  TimingConfig,
  DEFAULT_TIMING_CONFIG,
} from './types';
import {
  getTimeUntilMeeting,
  getTimeSinceMeetingEnded,
  formatDuration,
} from './context-engine';

/**
 * Candidate mode with its trigger reason.
 */
interface ModeCandidate {
  mode: Mode;
  priority: number;
  trigger: string;
  reason: string;
}

/**
 * Select the appropriate mode based on meeting context.
 *
 * Priority chain:
 * 1. CAPTURE - meeting is live
 * 2. PREP - meeting starts within prep window
 * 3. SYNTHESIS - meeting ended within synthesis window
 * 4. NEUTRAL - no meeting context
 */
export function selectMode(
  context: MeetingContext,
  config: TimingConfig = DEFAULT_TIMING_CONFIG
): ModeSelectionResult {
  const candidates = collectCandidates(context, config);

  // Sort by priority (highest first)
  candidates.sort((a, b) => b.priority - a.priority);

  // If no candidates, default to neutral
  if (candidates.length === 0) {
    return {
      mode: 'neutral_intent',
      confidence: 'LOW',
      reason: 'No meetings scheduled or recently ended',
      trigger: 'no_context',
    };
  }

  const winner = candidates[0];
  const confidence = assignConfidence(winner, candidates, context);

  return {
    mode: winner.mode,
    confidence,
    reason: winner.reason,
    trigger: winner.trigger,
  };
}

/**
 * Collect all candidate modes based on context.
 */
function collectCandidates(
  context: MeetingContext,
  config: TimingConfig
): ModeCandidate[] {
  const candidates: ModeCandidate[] = [];
  const { now } = context;

  // Check for live meeting → CAPTURE
  if (context.currentMeeting) {
    candidates.push({
      mode: 'meeting_capture',
      priority: MODE_PRIORITY.meeting_capture,
      trigger: 'meeting_live',
      reason: `"${context.currentMeeting.title}" is in progress`,
    });
  }

  // Check for upcoming meeting → PREP
  if (context.nextMeeting) {
    const timeUntil = getTimeUntilMeeting(context.nextMeeting, now);
    candidates.push({
      mode: 'meeting_prep',
      priority: MODE_PRIORITY.meeting_prep,
      trigger: 'meeting_upcoming',
      reason: `"${context.nextMeeting.title}" starts in ${formatDuration(timeUntil)}`,
    });
  }

  // Check for recently ended meeting → SYNTHESIS
  if (context.lastMeeting) {
    const timeSince = getTimeSinceMeetingEnded(context.lastMeeting, now);
    candidates.push({
      mode: 'meeting_synthesis_min',
      priority: MODE_PRIORITY.meeting_synthesis_min,
      trigger: 'meeting_ended',
      reason: `"${context.lastMeeting.title}" ended ${formatDuration(timeSince)} ago`,
    });
  }

  // Always include neutral as fallback
  candidates.push({
    mode: 'neutral_intent',
    priority: MODE_PRIORITY.neutral_intent,
    trigger: 'default',
    reason: 'No immediate meeting context',
  });

  return candidates;
}

/**
 * Assign confidence based on context strength.
 *
 * HIGH: Single strong trigger, no competing higher-priority trigger
 * MEDIUM: Trigger exists but competing trigger one level below
 * LOW: No strong triggers
 */
function assignConfidence(
  winner: ModeCandidate,
  candidates: ModeCandidate[],
  context: MeetingContext
): Confidence {
  // Filter out neutral from competition check
  const competingCandidates = candidates.filter(
    (c) => c.mode !== 'neutral_intent' && c.mode !== winner.mode
  );

  // HIGH confidence criteria:
  // - Live meeting (capture) with no prep conflict
  // - Prep with no synthesis conflict
  // - Clear single trigger
  if (competingCandidates.length === 0) {
    // Only winner mode has a trigger
    if (winner.mode !== 'neutral_intent') {
      return 'HIGH';
    }
  }

  // MEDIUM confidence criteria:
  // - Winner exists but there's a competing candidate one level below
  if (competingCandidates.length > 0) {
    const nextBestPriority = Math.max(...competingCandidates.map((c) => c.priority));

    // If competing candidate is exactly one level below
    if (winner.priority - nextBestPriority === 1) {
      return 'MEDIUM';
    }

    // If winner is significantly higher priority (2+ levels)
    if (winner.priority - nextBestPriority >= 2) {
      return 'HIGH';
    }
  }

  // Special case: Capture during live meeting is always HIGH
  if (winner.mode === 'meeting_capture' && context.currentMeeting) {
    return 'HIGH';
  }

  // LOW confidence: neutral mode or unclear context
  return 'LOW';
}

/**
 * Get alternatives that were considered but not selected.
 * Used for Decision Capsule.
 */
export function getAlternatives(
  context: MeetingContext,
  selectedMode: Mode,
  config: TimingConfig = DEFAULT_TIMING_CONFIG
): Array<{ mode: Mode; reason: string }> {
  const candidates = collectCandidates(context, config);

  return candidates
    .filter((c) => c.mode !== selectedMode && c.mode !== 'neutral_intent')
    .map((c) => ({
      mode: c.mode,
      reason: c.reason,
    }))
    .slice(0, 3); // Max 3 alternatives
}

/**
 * Get conditions under which the mode would change.
 * Used for Decision Capsule "Would change if" section.
 */
export function getWouldChangeConditions(
  selectedMode: Mode,
  context: MeetingContext
): string[] {
  const conditions: string[] = [];

  switch (selectedMode) {
    case 'neutral_intent':
      conditions.push('A meeting appears on your calendar within 45 minutes');
      conditions.push('You explicitly set an intent');
      break;

    case 'meeting_prep':
      conditions.push('The meeting starts (switches to Capture)');
      conditions.push('You manually switch to another mode');
      if (context.lastMeeting) {
        conditions.push('You choose to review the previous meeting instead');
      }
      break;

    case 'meeting_capture':
      conditions.push('The meeting ends (switches to Synthesis)');
      conditions.push('You manually switch to another mode');
      break;

    case 'meeting_synthesis_min':
      conditions.push('60 minutes pass since the meeting ended');
      conditions.push('A new meeting appears within prep window');
      conditions.push('You manually switch to Neutral');
      break;
  }

  return conditions;
}

/**
 * Get signals used for the decision.
 * Used for Decision Capsule transparency.
 */
export function getSignalsUsed(context: MeetingContext): string[] {
  const signals: string[] = [];

  if (context.currentMeeting) {
    signals.push(`Live meeting: "${context.currentMeeting.title}"`);
  }

  if (context.nextMeeting) {
    const timeUntil = getTimeUntilMeeting(context.nextMeeting, context.now);
    signals.push(`Upcoming: "${context.nextMeeting.title}" in ${formatDuration(timeUntil)}`);
  }

  if (context.lastMeeting) {
    const timeSince = getTimeSinceMeetingEnded(context.lastMeeting, context.now);
    signals.push(`Ended: "${context.lastMeeting.title}" ${formatDuration(timeSince)} ago`);
  }

  if (signals.length === 0) {
    signals.push('No calendar events in relevant windows');
  }

  return signals;
}

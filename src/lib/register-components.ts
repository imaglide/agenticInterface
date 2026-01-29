/**
 * Component Registration
 *
 * Registers all V1 components with the component registry.
 * Import this file once at app startup.
 */

import { registerComponent } from './component-registry';

// Neutral mode components
import { NeutralIntentSetter } from '@/components/neutral/NeutralIntentSetter';
import { SuggestedIntents } from '@/components/neutral/SuggestedIntents';
import { AdjacentModeSuggestions } from '@/components/neutral/AdjacentModeSuggestions';

// Shared components
import { MeetingHeader } from '@/components/shared/MeetingHeader';

// Prep mode components
import { MeetingGoalCard } from '@/components/prep/MeetingGoalCard';
import { My3GoalsCard } from '@/components/prep/My3GoalsCard';
import { PrepPromptsCard } from '@/components/prep/PrepPromptsCard';
import { ContextSnippetsCard } from '@/components/prep/ContextSnippetsCard';

// Capture mode components
import { CaptureMarkersPanel } from '@/components/capture/CaptureMarkersPanel';
import { GoalsChecklistStrip } from '@/components/capture/GoalsChecklistStrip';
import { BottomHintBar } from '@/components/capture/BottomHintBar';
import { MarkerLabelInput } from '@/components/capture/MarkerLabelInput';

// Synthesis mode components
import { GoalsOutcomeCard } from '@/components/synthesis/GoalsOutcomeCard';
import { MarkersSummaryCard } from '@/components/synthesis/MarkersSummaryCard';
import { NextActionsCard } from '@/components/synthesis/NextActionsCard';

// Workspace components
import { WorkspaceRenderer } from '@/workspaces/WorkspaceRenderer';

export function registerAllComponents(): void {
  // Neutral mode
  registerComponent('NeutralIntentSetter', NeutralIntentSetter);
  registerComponent('SuggestedIntents', SuggestedIntents);
  registerComponent('AdjacentModeSuggestions', AdjacentModeSuggestions);

  // Shared
  registerComponent('MeetingHeader', MeetingHeader);

  // Prep mode
  registerComponent('MeetingGoalCard', MeetingGoalCard);
  registerComponent('My3GoalsCard', My3GoalsCard);
  registerComponent('PrepPromptsCard', PrepPromptsCard);
  registerComponent('ContextSnippetsCard', ContextSnippetsCard);

  // Capture mode
  registerComponent('CaptureMarkersPanel', CaptureMarkersPanel);
  registerComponent('GoalsChecklistStrip', GoalsChecklistStrip);
  registerComponent('BottomHintBar', BottomHintBar);
  registerComponent('MarkerLabelInput', MarkerLabelInput);

  // Synthesis mode
  registerComponent('GoalsOutcomeCard', GoalsOutcomeCard);
  registerComponent('MarkersSummaryCard', MarkersSummaryCard);
  registerComponent('NextActionsCard', NextActionsCard);

  // Workspace
  registerComponent('WorkspaceRenderer', WorkspaceRenderer);
}

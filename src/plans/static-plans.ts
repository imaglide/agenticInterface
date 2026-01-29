/**
 * Static UI Plans
 *
 * Hardcoded plans for testing the UI without decision logic.
 * These will be replaced by dynamically generated plans in Phase F.
 */

import { UIPlan, DecisionCapsule, Mode } from '@/types/ui-plan';
import { My3Goal } from '@/components/prep/My3GoalsCard';
import { Marker } from '@/components/capture/CaptureMarkersPanel';

// ============================================
// Sample Data
// ============================================

export const sampleMeeting = {
  id: 'meeting-weekly-sync',
  title: 'Weekly Sync',
  startTime: Date.now() + 30 * 60 * 1000, // 30 min from now
  endTime: Date.now() + 90 * 60 * 1000,   // 90 min from now
  attendees: ['Alice Chen', 'Bob Smith', 'Carol Davis'],
  location: 'Zoom',
};

export const sampleGoals: My3Goal[] = [
  { id: 'g1', text: 'Get alignment on Q1 timeline', achieved: false },
  { id: 'g2', text: 'Understand blockers from eng team', achieved: true, achievedAt: Date.now() - 15 * 60 * 1000 },
  { id: 'g3', text: 'Confirm next steps with stakeholders', achieved: false },
];

export const sampleMarkers: Marker[] = [
  { id: 'm1', type: 'decision', label: 'Push launch to Feb 15', timestamp: Date.now() - 45 * 60 * 1000 },
  { id: 'm2', type: 'action', label: 'Alice to update roadmap', timestamp: Date.now() - 40 * 60 * 1000 },
  { id: 'm3', type: 'risk', label: 'API dependency unclear', timestamp: Date.now() - 30 * 60 * 1000 },
  { id: 'm4', type: 'action', label: 'Bob to check with platform team', timestamp: Date.now() - 25 * 60 * 1000 },
  { id: 'm5', type: 'question', timestamp: Date.now() - 20 * 60 * 1000 },
];

export const sampleContextSnippets = [
  {
    id: 'c1',
    title: 'Last meeting notes',
    content: 'Discussed timeline concerns. Alice raised API dependency risk. Agreed to follow up this week.',
    source: 'Meeting notes - Jan 10',
  },
  {
    id: 'c2',
    title: 'Related email thread',
    content: 'Bob mentioned platform team may have bandwidth issues in February.',
    source: 'Email - Jan 12',
  },
];

// ============================================
// Static Plans
// ============================================

export const staticPlans: Record<Mode, UIPlan> = {
  agentic_work_surface: {
    id: 'static-work-defaults',
    mode: 'agentic_work_surface',
    layout: 'stack', // Default layout
    confidence: 'LOW',
    reason: 'Static fallback',
    timestamp: Date.now(),
    components: []
  },
  neutral_intent: {
    id: 'static-neutral',
    mode: 'neutral_intent',
    layout: 'stack',
    confidence: 'LOW',
    reason: 'No strong context signals detected',
    timestamp: Date.now(),
    components: [
      {
        type: 'NeutralIntentSetter',
        id: 'intent-input',
        props: {
          placeholder: 'What do you want to focus on?',
        },
      },
      {
        type: 'SuggestedIntents',
        id: 'suggestions',
        props: {
          intents: [
            'Prepare for next meeting',
            'Review recent meeting',
            'Focus work',
          ],
        },
      },
      {
        type: 'AdjacentModeSuggestions',
        id: 'adjacent',
        props: {
          suggestions: [
            {
              mode: 'meeting_prep',
              label: 'Prepare for Weekly Sync',
              reason: 'Starts in 2 hours',
            },
          ],
        },
      },
    ],
  },

  meeting_prep: {
    id: 'static-prep',
    mode: 'meeting_prep',
    layout: 'split',
    confidence: 'HIGH',
    reason: `Meeting "${sampleMeeting.title}" starts in 30 minutes`,
    timestamp: Date.now(),
    components: [
      {
        type: 'MeetingHeader',
        id: 'header',
        props: {
          title: sampleMeeting.title,
          startTime: sampleMeeting.startTime,
          attendees: sampleMeeting.attendees,
          location: sampleMeeting.location,
        },
      },
      {
        type: 'MeetingGoalCard',
        id: 'goal',
        props: {
          goal: 'Align on Q1 roadmap priorities and identify blockers',
        },
      },
      {
        type: 'My3GoalsCard',
        id: 'my3',
        props: {
          goals: sampleGoals.map(g => ({ ...g, achieved: false, achievedAt: undefined })),
        },
      },
      {
        type: 'PrepPromptsCard',
        id: 'prompts',
        props: {
          prompts: [
            'What does success look like?',
            'What might go wrong?',
            'What do you need from others?',
          ],
        },
      },
      {
        type: 'ContextSnippetsCard',
        id: 'context',
        props: {
          collapsed: true,
          snippets: sampleContextSnippets,
        },
      },
    ],
  },

  meeting_capture: {
    id: 'static-capture',
    mode: 'meeting_capture',
    layout: 'single',
    confidence: 'HIGH',
    reason: `Meeting "${sampleMeeting.title}" is in progress`,
    timestamp: Date.now(),
    components: [
      {
        type: 'GoalsChecklistStrip',
        id: 'goals-strip',
        props: {
          goals: sampleGoals,
        },
      },
      {
        type: 'CaptureMarkersPanel',
        id: 'markers',
        props: {
          markers: sampleMarkers,
        },
      },
      {
        type: 'BottomHintBar',
        id: 'hints',
        props: {
          hotkeys: [
            { key: 'd', label: 'Decision' },
            { key: 'a', label: 'Action' },
            { key: 'r', label: 'Risk' },
            { key: 'q', label: 'Question' },
          ],
        },
      },
    ],
  },

  meeting_synthesis_min: {
    id: 'static-synthesis',
    mode: 'meeting_synthesis_min',
    layout: 'stack',
    confidence: 'HIGH',
    reason: `Meeting "${sampleMeeting.title}" ended 10 minutes ago`,
    timestamp: Date.now(),
    components: [
      {
        type: 'MeetingHeader',
        id: 'header',
        props: {
          title: sampleMeeting.title,
          startTime: Date.now() - 60 * 60 * 1000,
          endTime: Date.now() - 10 * 60 * 1000,
          attendees: sampleMeeting.attendees,
        },
      },
      {
        type: 'GoalsOutcomeCard',
        id: 'outcomes',
        props: {
          goals: sampleGoals,
        },
      },
      {
        type: 'MarkersSummaryCard',
        id: 'markers',
        props: {
          markers: sampleMarkers,
        },
      },
      {
        type: 'NextActionsCard',
        id: 'actions',
        props: {},
      },
    ],
  },
};

// ============================================
// Static Decision Capsules
// ============================================

export const staticCapsules: Record<Mode, DecisionCapsule> = {
  agentic_work_surface: {
    viewLabel: 'Agentic Workspace',
    confidence: 'HIGH',
    reason: 'Selected by intent',
    signalsUsed: [],
    alternativesConsidered: [],
    wouldChangeIf: [],
    actions: []
  },
  neutral_intent: {
    viewLabel: 'Neutral / Intent',
    confidence: 'LOW',
    reason: 'No strong context signals detected',
    signalsUsed: [
      'No meetings within prep window (45 min)',
      'No recent meetings within synthesis window (60 min)',
    ],
    alternativesConsidered: [
      { mode: 'meeting_prep', reason: 'Next meeting is 2+ hours away' },
    ],
    wouldChangeIf: [
      'A meeting starts within 45 minutes',
      'You set a specific intent',
    ],
    actions: [
      { type: 'set_intent', label: 'Set intent' },
      { type: 'switch_view', label: 'Go to Prep', target: 'meeting_prep' },
    ],
  },

  meeting_prep: {
    viewLabel: 'Meeting Prep',
    confidence: 'HIGH',
    reason: `"${sampleMeeting.title}" starts in 30 minutes`,
    signalsUsed: [
      'Meeting starts within prep window (45 min)',
      'Meeting has 3 attendees',
      'You are the organizer',
    ],
    alternativesConsidered: [
      { mode: 'neutral_intent', reason: 'Could focus on other work instead' },
    ],
    wouldChangeIf: [
      'Meeting is cancelled',
      'Meeting starts (→ Capture)',
      'You switch to another view',
    ],
    actions: [
      { type: 'switch_view', label: 'Skip prep', target: 'neutral_intent' },
    ],
  },

  meeting_capture: {
    viewLabel: 'Meeting Capture',
    confidence: 'HIGH',
    reason: `"${sampleMeeting.title}" is currently in progress`,
    signalsUsed: [
      'Current time is within meeting window',
      'Meeting started 15 minutes ago',
    ],
    alternativesConsidered: [],
    wouldChangeIf: [
      'Meeting ends (→ Synthesis)',
      'You manually exit capture mode',
    ],
    actions: [
      { type: 'switch_view', label: 'Exit capture', target: 'meeting_synthesis_min' },
    ],
  },

  meeting_synthesis_min: {
    viewLabel: 'Post-Meeting Synthesis',
    confidence: 'HIGH',
    reason: `"${sampleMeeting.title}" ended 10 minutes ago`,
    signalsUsed: [
      'Meeting ended within synthesis window (60 min)',
      '5 markers captured during meeting',
      '1 of 3 goals achieved',
    ],
    alternativesConsidered: [
      { mode: 'meeting_prep', reason: 'No upcoming meetings in prep window' },
    ],
    wouldChangeIf: [
      'Synthesis window expires (60 min)',
      'Another meeting enters prep window',
      'You complete synthesis',
    ],
    actions: [
      { type: 'switch_view', label: 'Done', target: 'neutral_intent' },
    ],
  },
};

// ============================================
// Mode Labels
// ============================================

export const modeLabels: Record<Mode, string> = {
  neutral_intent: 'Neutral / Intent',
  meeting_prep: 'Meeting Prep',
  meeting_capture: 'Meeting Capture',
  meeting_synthesis_min: 'Post-Meeting Synthesis',
  agentic_work_surface: 'Agentic Workspace',
};

export const modeDescriptions: Record<Mode, string> = {
  neutral_intent: 'No strong context — ask for intent',
  meeting_prep: 'Orient and clarify goals before meeting',
  meeting_capture: 'Mark key moments during meeting',
  meeting_synthesis_min: 'Close the loop after meeting',
  agentic_work_surface: 'Dynamic workspace for your intent',
};

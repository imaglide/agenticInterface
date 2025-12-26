/**
 * Predefined Test Scenarios
 *
 * Collection of scenarios for testing different contexts and intents.
 * Each scenario represents a complete state: calendar, meetings, goals, markers.
 */

import type { TestScenario, TimelineScenario } from './types';

// Re-export types for convenience
export type { TimelineScenario } from './types';

/**
 * Basic scenarios for core functionality testing.
 */
export const basicScenarios: TestScenario[] = [
  {
    id: 'empty-slate',
    name: 'Empty Slate',
    description: 'Clean state with no meetings or data. Tests neutral mode.',
    tags: ['basic', 'neutral'],
    calendarEvents: [],
    meetings: [],
    intents: [],
    expectedMode: 'neutral_intent',
  },

  {
    id: 'upcoming-meeting-30min',
    name: 'Meeting in 30 Minutes',
    description: 'Single meeting starting in 30 minutes. Should trigger prep mode.',
    tags: ['basic', 'prep'],
    calendarEvents: [
      {
        id: 'cal-upcoming-1',
        iCalUid: 'ical-upcoming-1@test',
        title: 'Q4 Planning Review',
        startMinutes: 30,
        durationMinutes: 60,
        attendees: [
          { email: 'alice@example.com', name: 'Alice Chen', responseStatus: 'accepted' },
          { email: 'bob@example.com', name: 'Bob Smith', responseStatus: 'tentative' },
        ],
        location: 'Conference Room A',
        description: 'Review Q4 roadmap and discuss resource allocation.',
      },
    ],
    meetings: [
      {
        id: 'mtg-upcoming-1',
        title: 'Q4 Planning Review',
        startMinutes: 30,
        durationMinutes: 60,
        attendees: ['Alice Chen', 'Bob Smith'],
        goal: 'Align on Q4 priorities and resource needs',
        goals: [],
        markers: [],
      },
    ],
    expectedMode: 'meeting_prep',
  },

  {
    id: 'active-meeting',
    name: 'Meeting In Progress',
    description: 'Meeting that started 15 minutes ago. Should be in capture mode.',
    tags: ['basic', 'capture'],
    calendarEvents: [
      {
        id: 'cal-active-1',
        iCalUid: 'ical-active-1@test',
        title: 'Sprint Retrospective',
        startMinutes: -15,
        durationMinutes: 45,
        attendees: [
          { email: 'team@example.com', name: 'Dev Team', responseStatus: 'accepted' },
        ],
      },
    ],
    meetings: [
      {
        id: 'mtg-active-1',
        title: 'Sprint Retrospective',
        startMinutes: -15,
        durationMinutes: 45,
        attendees: ['Dev Team'],
        goals: [
          { text: 'Identify process improvements', achieved: false },
          { text: 'Celebrate wins', achieved: true },
        ],
        markers: [
          { type: 'decision', label: 'Move standup to 10am', offsetMinutes: 5 },
          { type: 'action', label: '@alice to update wiki', offsetMinutes: 10 },
        ],
      },
    ],
    expectedMode: 'meeting_capture',
  },

  {
    id: 'post-meeting',
    name: 'Just Finished Meeting',
    description: 'Meeting ended 5 minutes ago. Should be in synthesis mode.',
    tags: ['basic', 'synthesis'],
    calendarEvents: [
      {
        id: 'cal-finished-1',
        iCalUid: 'ical-finished-1@test',
        title: 'Client Kickoff',
        startMinutes: -65,
        durationMinutes: 60,
        attendees: [
          { email: 'client@acme.com', name: 'Client PM', responseStatus: 'accepted' },
        ],
      },
    ],
    meetings: [
      {
        id: 'mtg-finished-1',
        title: 'Client Kickoff',
        startMinutes: -65,
        durationMinutes: 60,
        attendees: ['Client PM'],
        goals: [
          { text: 'Understand project scope', achieved: true },
          { text: 'Agree on timeline', achieved: true },
          { text: 'Identify key stakeholders', achieved: false },
        ],
        markers: [
          { type: 'decision', label: 'Start date: Jan 15', offsetMinutes: 20 },
          { type: 'risk', label: 'Budget not yet approved', offsetMinutes: 35 },
          { type: 'action', label: 'Send SOW by Friday', offsetMinutes: 50 },
          { type: 'question', label: 'Who handles compliance?', offsetMinutes: 55 },
        ],
        synthesisCompleted: false,
      },
    ],
    expectedMode: 'meeting_synthesis_min',
  },
];

/**
 * Complex scenarios for stress testing and edge cases.
 */
export const complexScenarios: TestScenario[] = [
  {
    id: 'back-to-back',
    name: 'Back-to-Back Meetings',
    description: 'Three meetings in a row with no breaks. Tests mode transitions.',
    tags: ['complex', 'transitions'],
    calendarEvents: [
      {
        id: 'cal-b2b-1',
        title: 'Morning Standup',
        startMinutes: -90,
        durationMinutes: 30,
      },
      {
        id: 'cal-b2b-2',
        title: 'Design Review',
        startMinutes: -60,
        durationMinutes: 60,
      },
      {
        id: 'cal-b2b-3',
        title: 'Stakeholder Update',
        startMinutes: 0,
        durationMinutes: 30,
      },
    ],
    meetings: [
      {
        id: 'mtg-b2b-1',
        title: 'Morning Standup',
        startMinutes: -90,
        durationMinutes: 30,
        attendees: ['Team'],
        goals: [
          { text: 'Share blockers', achieved: true },
        ],
        markers: [
          { type: 'action', label: 'Help Jane with auth bug' },
        ],
        synthesisCompleted: true,
      },
      {
        id: 'mtg-b2b-2',
        title: 'Design Review',
        startMinutes: -60,
        durationMinutes: 60,
        attendees: ['Design Team', 'Product'],
        goals: [
          { text: 'Approve new dashboard layout', achieved: true },
          { text: 'Discuss mobile responsive approach', achieved: false },
        ],
        markers: [
          { type: 'decision', label: 'Use grid layout for dashboard' },
          { type: 'decision', label: 'Postpone mobile to v2' },
          { type: 'risk', label: 'Accessibility review pending' },
        ],
        synthesisCompleted: false,
      },
      {
        id: 'mtg-b2b-3',
        title: 'Stakeholder Update',
        startMinutes: 0,
        durationMinutes: 30,
        attendees: ['VP Engineering', 'Product Director'],
        goals: [
          { text: 'Report on Q3 progress', achieved: false },
          { text: 'Get approval for new hires', achieved: false },
        ],
      },
    ],
    expectedMode: 'meeting_capture',
  },

  {
    id: 'busy-monday',
    name: 'Busy Monday Morning',
    description: 'Full calendar with 5 meetings, intents from last week.',
    tags: ['complex', 'realistic'],
    calendarEvents: [
      {
        id: 'cal-mon-1',
        title: 'Weekly Team Sync',
        startMinutes: -180,
        durationMinutes: 60,
      },
      {
        id: 'cal-mon-2',
        title: '1:1 with Manager',
        startMinutes: -60,
        durationMinutes: 30,
      },
      {
        id: 'cal-mon-3',
        title: 'Product Planning',
        startMinutes: 15,
        durationMinutes: 90,
      },
      {
        id: 'cal-mon-4',
        title: 'Lunch & Learn',
        startMinutes: 180,
        durationMinutes: 60,
        description: 'Optional: Kubernetes Deep Dive',
      },
      {
        id: 'cal-mon-5',
        title: 'Client Call',
        startMinutes: 300,
        durationMinutes: 45,
      },
    ],
    meetings: [
      {
        id: 'mtg-mon-1',
        title: 'Weekly Team Sync',
        startMinutes: -180,
        durationMinutes: 60,
        attendees: ['Full Team'],
        goals: [
          { text: 'Review sprint progress', achieved: true },
          { text: 'Identify blockers', achieved: true },
        ],
        markers: [
          { type: 'decision', label: 'Extend sprint by 1 day' },
        ],
        synthesisCompleted: true,
      },
      {
        id: 'mtg-mon-2',
        title: '1:1 with Manager',
        startMinutes: -60,
        durationMinutes: 30,
        attendees: ['Sarah (Manager)'],
        goals: [
          { text: 'Discuss career growth', achieved: true },
          { text: 'Get feedback on project lead role', achieved: true },
        ],
        markers: [
          { type: 'action', label: 'Draft project lead proposal' },
          { type: 'question', label: 'Timeline for promotion cycle?' },
        ],
        synthesisCompleted: false,
      },
      {
        id: 'mtg-mon-3',
        title: 'Product Planning',
        startMinutes: 15,
        durationMinutes: 90,
        attendees: ['Product', 'Engineering', 'Design'],
        goals: [
          { text: 'Prioritize Q1 features', achieved: false },
          { text: 'Estimate engineering effort', achieved: false },
          { text: 'Identify dependencies', achieved: false },
        ],
      },
    ],
    intents: [
      {
        scope: 'session',
        type: 'goal',
        text: 'Finish project lead proposal draft',
        status: 'open',
      },
      {
        scope: 'session',
        type: 'action',
        text: 'Review PR #234 from last week',
        status: 'open',
      },
      {
        scope: 'meeting',
        type: 'question',
        text: 'Ask about budget for new tools',
        status: 'open',
        meetingId: 'mtg-mon-3',
      },
    ],
    expectedMode: 'meeting_prep',
  },

  {
    id: 'quiet-afternoon',
    name: 'Quiet Afternoon',
    description: 'No upcoming meetings, just historical data. Tests neutral mode with context.',
    tags: ['complex', 'neutral'],
    calendarEvents: [
      {
        id: 'cal-quiet-1',
        title: 'Morning Meeting',
        startMinutes: -300,
        durationMinutes: 60,
      },
    ],
    meetings: [
      {
        id: 'mtg-quiet-1',
        title: 'Morning Meeting',
        startMinutes: -300,
        durationMinutes: 60,
        attendees: ['Team'],
        goals: [
          { text: 'Plan the week', achieved: true },
        ],
        synthesisCompleted: true,
      },
    ],
    intents: [
      {
        scope: 'session',
        type: 'goal',
        text: 'Focus time: complete feature implementation',
        status: 'open',
      },
      {
        scope: 'session',
        type: 'note',
        text: 'Remember to submit timesheet by EOD',
        status: 'open',
      },
    ],
    expectedMode: 'neutral_intent',
  },
];

/**
 * Timeline scenarios with checkpoints for iteration testing.
 */
export const timelineScenarios: TimelineScenario[] = [
  {
    id: 'meeting-lifecycle',
    name: 'Full Meeting Lifecycle',
    description: 'Walk through a complete meeting from prep to synthesis.',
    tags: ['timeline', 'lifecycle'],
    calendarEvents: [
      {
        id: 'cal-lifecycle-1',
        iCalUid: 'ical-lifecycle-1@test',
        title: 'Important Strategy Meeting',
        startMinutes: 0, // Meeting at t=0
        durationMinutes: 60,
        attendees: [
          { email: 'ceo@example.com', name: 'CEO', responseStatus: 'accepted' },
          { email: 'cto@example.com', name: 'CTO', responseStatus: 'accepted' },
        ],
        location: 'Board Room',
      },
    ],
    meetings: [
      {
        id: 'mtg-lifecycle-1',
        title: 'Important Strategy Meeting',
        startMinutes: 0,
        durationMinutes: 60,
        attendees: ['CEO', 'CTO'],
        goal: 'Decide on Q1 strategy direction',
      },
    ],
    checkpoints: [
      {
        id: 'cp-1-hour-before',
        name: '1 Hour Before',
        description: 'Early prep window - should suggest setting goals',
        offsetMinutes: -60,
        expectedMode: 'meeting_prep',
      },
      {
        id: 'cp-15-min-before',
        name: '15 Minutes Before',
        description: 'Final prep - review goals, check materials',
        offsetMinutes: -15,
        expectedMode: 'meeting_prep',
      },
      {
        id: 'cp-meeting-start',
        name: 'Meeting Start',
        description: 'Transition to capture mode',
        offsetMinutes: 0,
        expectedMode: 'meeting_capture',
      },
      {
        id: 'cp-mid-meeting',
        name: 'Mid-Meeting',
        description: 'Active capture - markers should be easy to add',
        offsetMinutes: 30,
        expectedMode: 'meeting_capture',
      },
      {
        id: 'cp-meeting-end',
        name: 'Meeting End',
        description: 'Transition to synthesis',
        offsetMinutes: 60,
        expectedMode: 'meeting_synthesis_min',
      },
      {
        id: 'cp-15-min-after',
        name: '15 Minutes After',
        description: 'Still in synthesis window',
        offsetMinutes: 75,
        expectedMode: 'meeting_synthesis_min',
      },
      {
        id: 'cp-1-hour-after',
        name: '1 Hour After',
        description: 'Should return to neutral (if no other meetings)',
        offsetMinutes: 120,
        expectedMode: 'neutral_intent',
      },
    ],
    expectedMode: 'meeting_prep',
    timeOffsetMinutes: -60, // Start at 1 hour before meeting
  },

  {
    id: 'transition-stress',
    name: 'Rapid Mode Transitions',
    description: 'Test stability during rapid context changes.',
    tags: ['timeline', 'stress'],
    calendarEvents: [
      {
        id: 'cal-stress-1',
        title: 'Quick Check-in',
        startMinutes: 0,
        durationMinutes: 15,
      },
      {
        id: 'cal-stress-2',
        title: 'Follow-up Discussion',
        startMinutes: 20,
        durationMinutes: 15,
      },
      {
        id: 'cal-stress-3',
        title: 'Final Decision',
        startMinutes: 40,
        durationMinutes: 15,
      },
    ],
    meetings: [
      {
        id: 'mtg-stress-1',
        title: 'Quick Check-in',
        startMinutes: 0,
        durationMinutes: 15,
        attendees: ['Team'],
      },
      {
        id: 'mtg-stress-2',
        title: 'Follow-up Discussion',
        startMinutes: 20,
        durationMinutes: 15,
        attendees: ['Team'],
      },
      {
        id: 'mtg-stress-3',
        title: 'Final Decision',
        startMinutes: 40,
        durationMinutes: 15,
        attendees: ['Team'],
      },
    ],
    checkpoints: [
      { id: 'stress-cp-1', name: 'Before First', description: 'Prep for meeting 1', offsetMinutes: -10, expectedMode: 'meeting_prep' },
      { id: 'stress-cp-2', name: 'In Meeting 1', description: 'Capture mode', offsetMinutes: 5, expectedMode: 'meeting_capture' },
      { id: 'stress-cp-3', name: 'Between 1-2', description: 'Brief synthesis/prep window', offsetMinutes: 17, expectedMode: 'meeting_prep' },
      { id: 'stress-cp-4', name: 'In Meeting 2', description: 'Capture mode', offsetMinutes: 25, expectedMode: 'meeting_capture' },
      { id: 'stress-cp-5', name: 'Between 2-3', description: 'Brief synthesis/prep window', offsetMinutes: 37, expectedMode: 'meeting_prep' },
      { id: 'stress-cp-6', name: 'In Meeting 3', description: 'Capture mode', offsetMinutes: 45, expectedMode: 'meeting_capture' },
      { id: 'stress-cp-7', name: 'After All', description: 'Final synthesis', offsetMinutes: 60, expectedMode: 'meeting_synthesis_min' },
    ],
    expectedMode: 'meeting_prep',
    timeOffsetMinutes: -10,
  },
];

/**
 * Edge case scenarios - boundary conditions and unusual states.
 */
export const edgeCaseScenarios: TestScenario[] = [
  // ============================================
  // Time Boundary Edge Cases
  // ============================================
  {
    id: 'edge-exact-prep-boundary',
    name: 'Exactly at Prep Boundary (45min)',
    description: 'Meeting starts in exactly 45 minutes - boundary of prep window.',
    tags: ['edge', 'time', 'boundary'],
    meetings: [
      {
        id: 'mtg-boundary-45',
        title: 'Boundary Test Meeting',
        startMinutes: 45, // Exactly at prep boundary
        durationMinutes: 30,
        attendees: ['Tester'],
      },
    ],
    expectedMode: 'meeting_prep',
  },

  {
    id: 'edge-just-outside-prep',
    name: 'Just Outside Prep Window (46min)',
    description: 'Meeting starts in 46 minutes - just outside prep window.',
    tags: ['edge', 'time', 'boundary'],
    meetings: [
      {
        id: 'mtg-boundary-46',
        title: 'Outside Prep Window',
        startMinutes: 46, // Just outside
        durationMinutes: 30,
        attendees: ['Tester'],
      },
    ],
    expectedMode: 'neutral_intent',
  },

  {
    id: 'edge-meeting-just-started',
    name: 'Meeting Just Started (1min ago)',
    description: 'Meeting started 1 minute ago - early capture.',
    tags: ['edge', 'time', 'capture'],
    meetings: [
      {
        id: 'mtg-just-started',
        title: 'Just Started Meeting',
        startMinutes: -1,
        durationMinutes: 60,
        attendees: ['Team'],
      },
    ],
    expectedMode: 'meeting_capture',
  },

  {
    id: 'edge-meeting-about-to-end',
    name: 'Meeting Ending (1min left)',
    description: 'Meeting has 1 minute remaining.',
    tags: ['edge', 'time', 'capture'],
    meetings: [
      {
        id: 'mtg-ending',
        title: 'Ending Meeting',
        startMinutes: -59,
        durationMinutes: 60,
        attendees: ['Team'],
      },
    ],
    expectedMode: 'meeting_capture',
  },

  {
    id: 'edge-synthesis-boundary',
    name: 'At Synthesis Window End (60min after)',
    description: 'Meeting ended exactly 60 minutes ago - synthesis boundary.',
    tags: ['edge', 'time', 'boundary', 'synthesis'],
    meetings: [
      {
        id: 'mtg-synthesis-boundary',
        title: 'Synthesis Boundary Test',
        startMinutes: -120,
        durationMinutes: 60,
        attendees: ['Team'],
        goals: [{ text: 'Test boundary', achieved: true }],
        synthesisCompleted: false,
      },
    ],
    expectedMode: 'meeting_synthesis_min',
  },

  // ============================================
  // Data Edge Cases
  // ============================================
  {
    id: 'edge-max-goals',
    name: 'Maximum Goals (3)',
    description: 'Meeting with all 3 goal slots filled.',
    tags: ['edge', 'data', 'goals'],
    meetings: [
      {
        id: 'mtg-max-goals',
        title: 'Full Goals Meeting',
        startMinutes: 30,
        durationMinutes: 60,
        attendees: ['Team'],
        goals: [
          { text: 'First goal with moderate length text', achieved: false },
          { text: 'Second goal also has some content', achieved: true },
          { text: 'Third and final goal fills the slot', achieved: false },
        ],
      },
    ],
    expectedMode: 'meeting_prep',
  },

  {
    id: 'edge-many-markers',
    name: 'Many Markers (20+)',
    description: 'Meeting with many markers to test list rendering.',
    tags: ['edge', 'data', 'markers'],
    meetings: [
      {
        id: 'mtg-many-markers',
        title: 'Marker Heavy Meeting',
        startMinutes: -30,
        durationMinutes: 60,
        attendees: ['Large Team'],
        markers: [
          { type: 'decision', label: 'Decision 1: Go with option A' },
          { type: 'action', label: 'Action 1: @alice to follow up' },
          { type: 'risk', label: 'Risk 1: Timeline might slip' },
          { type: 'question', label: 'Question 1: What about budget?' },
          { type: 'decision', label: 'Decision 2: Postpone feature X' },
          { type: 'action', label: 'Action 2: @bob to review docs' },
          { type: 'risk', label: 'Risk 2: Dependencies unclear' },
          { type: 'question', label: 'Question 2: Who owns this?' },
          { type: 'decision', label: 'Decision 3: Approved design' },
          { type: 'action', label: 'Action 3: Schedule follow-up' },
          { type: 'decision', label: 'Decision 4: Use new framework' },
          { type: 'action', label: 'Action 4: Create migration plan' },
          { type: 'risk', label: 'Risk 3: Learning curve' },
          { type: 'question', label: 'Question 3: Training needed?' },
          { type: 'decision', label: 'Decision 5: Hire contractor' },
          { type: 'action', label: 'Action 5: Post job listing' },
          { type: 'action', label: 'Action 6: Review candidates' },
          { type: 'action', label: 'Action 7: Schedule interviews' },
          { type: 'risk', label: 'Risk 4: Budget constraints' },
          { type: 'question', label: 'Question 4: Start date?' },
        ],
      },
    ],
    expectedMode: 'meeting_capture',
  },

  {
    id: 'edge-zero-duration',
    name: 'Zero Duration Meeting',
    description: 'Calendar event with 0 minutes duration.',
    tags: ['edge', 'data', 'breaking'],
    meetings: [
      {
        id: 'mtg-zero-duration',
        title: 'Instant Meeting',
        startMinutes: 30,
        durationMinutes: 0, // Zero duration!
        attendees: ['Nobody'],
      },
    ],
    expectedMode: 'meeting_prep',
  },

  {
    id: 'edge-very-long-meeting',
    name: 'Very Long Meeting (8 hours)',
    description: 'All-day workshop style meeting.',
    tags: ['edge', 'data', 'duration'],
    meetings: [
      {
        id: 'mtg-long',
        title: 'All-Day Strategy Workshop',
        startMinutes: -120, // Started 2 hours ago
        durationMinutes: 480, // 8 hours
        attendees: ['Leadership Team'],
        goals: [
          { text: 'Complete strategic planning', achieved: false },
        ],
      },
    ],
    expectedMode: 'meeting_capture',
  },

  // ============================================
  // Overlap and Conflict Cases
  // ============================================
  {
    id: 'edge-overlapping-meetings',
    name: 'Overlapping Meetings',
    description: 'Two meetings that overlap in time.',
    tags: ['edge', 'conflict', 'overlap'],
    meetings: [
      {
        id: 'mtg-overlap-1',
        title: 'First Overlapping Meeting',
        startMinutes: -30,
        durationMinutes: 60,
        attendees: ['Team A'],
      },
      {
        id: 'mtg-overlap-2',
        title: 'Second Overlapping Meeting',
        startMinutes: 0,
        durationMinutes: 60,
        attendees: ['Team B'],
      },
    ],
    expectedMode: 'meeting_capture',
  },

  {
    id: 'edge-nested-meetings',
    name: 'Nested Meetings',
    description: 'Short meeting completely inside a longer one.',
    tags: ['edge', 'conflict', 'nested'],
    meetings: [
      {
        id: 'mtg-outer',
        title: 'Long Workshop',
        startMinutes: -60,
        durationMinutes: 180,
        attendees: ['Full Team'],
      },
      {
        id: 'mtg-inner',
        title: 'Quick Breakout',
        startMinutes: 0,
        durationMinutes: 30,
        attendees: ['Sub-team'],
      },
    ],
    expectedMode: 'meeting_capture',
  },

  // ============================================
  // Empty and Minimal States
  // ============================================
  {
    id: 'edge-meeting-no-attendees',
    name: 'Meeting with No Attendees',
    description: 'Solo meeting or blocked time.',
    tags: ['edge', 'data', 'minimal'],
    meetings: [
      {
        id: 'mtg-solo',
        title: 'Focus Time',
        startMinutes: 30,
        durationMinutes: 60,
        attendees: [], // No attendees
      },
    ],
    expectedMode: 'meeting_prep',
  },

  {
    id: 'edge-meeting-no-title',
    name: 'Meeting with Empty Title',
    description: 'Meeting without a title.',
    tags: ['edge', 'data', 'breaking'],
    meetings: [
      {
        id: 'mtg-no-title',
        title: '', // Empty title
        startMinutes: 30,
        durationMinutes: 60,
        attendees: ['Someone'],
      },
    ],
    expectedMode: 'meeting_prep',
  },
];

/**
 * Stress test scenarios - breaking cases, special characters, load testing.
 */
export const stressTestScenarios: TestScenario[] = [
  // ============================================
  // Special Characters and Unicode
  // ============================================
  {
    id: 'stress-unicode-titles',
    name: 'Unicode Meeting Titles',
    description: 'Meetings with emoji, CJK, RTL, and special characters.',
    tags: ['stress', 'unicode', 'i18n'],
    meetings: [
      {
        id: 'mtg-emoji',
        title: '🚀 Launch Planning 🎉 Sprint Review 💡',
        startMinutes: 30,
        durationMinutes: 60,
        attendees: ['Team 🦄'],
        goals: [
          { text: '✅ Confirm launch date', achieved: false },
          { text: '📊 Review metrics dashboard', achieved: false },
        ],
        markers: [
          { type: 'decision', label: '👍 Approved for launch' },
          { type: 'action', label: '📧 Send announcement email' },
        ],
      },
      {
        id: 'mtg-cjk',
        title: '会议 - 产品评审 (Meeting - Product Review)',
        startMinutes: 120,
        durationMinutes: 45,
        attendees: ['张三', '李四', 'John Smith'],
      },
      {
        id: 'mtg-rtl',
        title: 'اجتماع المراجعة (Review Meeting)',
        startMinutes: 180,
        durationMinutes: 30,
        attendees: ['أحمد', 'محمد'],
      },
    ],
    expectedMode: 'meeting_prep',
  },

  {
    id: 'stress-special-chars',
    name: 'Special Characters in Text',
    description: 'Test HTML entities, SQL-like strings, script tags.',
    tags: ['stress', 'security', 'xss'],
    meetings: [
      {
        id: 'mtg-special',
        title: '<script>alert("xss")</script> Meeting',
        startMinutes: 30,
        durationMinutes: 60,
        attendees: ['user@example.com; DROP TABLE users;--'],
        goal: '"><img src=x onerror=alert(1)>',
        goals: [
          { text: "Test O'Brien's idea & Bob's plan", achieved: false },
          { text: 'Check if 1 < 2 && 3 > 2', achieved: false },
          { text: '${process.env.SECRET}', achieved: false },
        ],
        markers: [
          { type: 'action', label: "Fix the bug in 'module'" },
          { type: 'question', label: 'What about {{template}} syntax?' },
        ],
      },
    ],
    expectedMode: 'meeting_prep',
  },

  {
    id: 'stress-very-long-text',
    name: 'Very Long Text Content',
    description: 'Extremely long titles, goals, and marker labels.',
    tags: ['stress', 'overflow', 'layout'],
    meetings: [
      {
        id: 'mtg-long-text',
        title: 'This is an extremely long meeting title that goes on and on and on and contains many words to test how the UI handles overflow situations when the title is much longer than expected or reasonable for a typical meeting name in a calendar application',
        startMinutes: 30,
        durationMinutes: 60,
        attendees: [
          'Person With A Very Long Name That Might Cause Layout Issues',
          'Another Person With An Equally Long Name For Testing',
        ],
        goals: [
          { text: 'This goal is intentionally very long to test text wrapping and truncation behavior in the UI. It contains multiple sentences and should stress test the goal display component. The user interface should handle this gracefully without breaking the layout or causing horizontal scrolling issues.', achieved: false },
        ],
        markers: [
          { type: 'decision', label: 'We decided to implement the feature using the new architecture pattern that was discussed in the previous meeting, taking into account all the feedback from stakeholders and technical constraints identified during the discovery phase' },
        ],
      },
    ],
    expectedMode: 'meeting_prep',
  },

  // ============================================
  // Load and Volume Testing
  // ============================================
  {
    id: 'stress-many-meetings',
    name: 'Many Meetings (50+)',
    description: 'Large number of meetings to test performance.',
    tags: ['stress', 'load', 'performance'],
    meetings: Array.from({ length: 50 }, (_, i) => ({
      id: `mtg-load-${i}`,
      title: `Meeting ${i + 1}: ${['Standup', 'Review', 'Planning', 'Sync', '1:1'][i % 5]}`,
      startMinutes: -1440 + (i * 60), // Spread over last 24 hours
      durationMinutes: 30,
      attendees: ['Team'],
      goals: i % 3 === 0 ? [{ text: `Goal for meeting ${i + 1}`, achieved: i % 2 === 0 }] : [],
      markers: i % 2 === 0 ? [{ type: 'action' as const, label: `Action from meeting ${i + 1}` }] : [],
    })),
    expectedMode: 'neutral_intent',
  },

  {
    id: 'stress-many-intents',
    name: 'Many Active Intents (30+)',
    description: 'Large intent backlog to test intent display.',
    tags: ['stress', 'load', 'intents'],
    intents: Array.from({ length: 30 }, (_, i) => ({
      scope: i % 3 === 0 ? 'meeting' as const : 'session' as const,
      type: (['goal', 'action', 'question', 'note', 'data_need'] as const)[i % 5],
      text: `Intent item ${i + 1}: This is a ${['goal', 'action', 'question', 'note', 'data need'][i % 5]} that needs attention`,
      status: (['open', 'satisfied', 'deferred'] as const)[i % 3],
    })),
    expectedMode: 'neutral_intent',
  },

  // ============================================
  // Rapid State Changes
  // ============================================
  {
    id: 'stress-concurrent-meetings',
    name: 'Many Concurrent Meetings',
    description: 'Multiple meetings at the same time.',
    tags: ['stress', 'conflict', 'concurrent'],
    meetings: Array.from({ length: 5 }, (_, i) => ({
      id: `mtg-concurrent-${i}`,
      title: `Concurrent Meeting ${i + 1}`,
      startMinutes: -15, // All started 15 min ago
      durationMinutes: 60,
      attendees: [`Team ${i + 1}`],
    })),
    expectedMode: 'meeting_capture',
  },

  // ============================================
  // Edge Time Values
  // ============================================
  {
    id: 'stress-negative-duration',
    name: 'Negative Duration (Invalid)',
    description: 'Meeting with negative duration - should handle gracefully.',
    tags: ['stress', 'invalid', 'breaking'],
    meetings: [
      {
        id: 'mtg-negative',
        title: 'Broken Meeting',
        startMinutes: 30,
        durationMinutes: -60, // Invalid!
        attendees: ['Nobody'],
      },
    ],
    expectedMode: 'meeting_prep',
  },

  {
    id: 'stress-very-old-meeting',
    name: 'Very Old Meeting',
    description: 'Meeting from a week ago - stale data handling.',
    tags: ['stress', 'stale', 'historical'],
    meetings: [
      {
        id: 'mtg-old',
        title: 'Ancient History Meeting',
        startMinutes: -10080, // 7 days ago
        durationMinutes: 60,
        attendees: ['Past Team'],
        goals: [{ text: 'Old goal', achieved: true }],
        synthesisCompleted: false, // Never completed synthesis
      },
    ],
    expectedMode: 'neutral_intent',
  },

  {
    id: 'stress-far-future-meeting',
    name: 'Far Future Meeting',
    description: 'Meeting scheduled weeks from now.',
    tags: ['stress', 'future', 'scheduling'],
    meetings: [
      {
        id: 'mtg-future',
        title: 'Future Planning Session',
        startMinutes: 20160, // 2 weeks from now
        durationMinutes: 120,
        attendees: ['Future Team'],
      },
    ],
    expectedMode: 'neutral_intent',
  },

  // ============================================
  // Whitespace and Empty Content
  // ============================================
  {
    id: 'stress-whitespace',
    name: 'Whitespace Content',
    description: 'Content with only whitespace.',
    tags: ['stress', 'whitespace', 'breaking'],
    meetings: [
      {
        id: 'mtg-whitespace',
        title: '   ', // Only spaces
        startMinutes: 30,
        durationMinutes: 60,
        attendees: ['  ', '\t', '\n'],
        goal: '   \n\t   ',
        goals: [
          { text: '   ', achieved: false },
          { text: '\t\t\t', achieved: false },
        ],
      },
    ],
    expectedMode: 'meeting_prep',
  },
];

/**
 * All scenarios grouped by category.
 */
export const allScenarios = {
  basic: basicScenarios,
  complex: complexScenarios,
  timeline: timelineScenarios,
  edge: edgeCaseScenarios,
  stress: stressTestScenarios,
};

/**
 * Get all scenarios as a flat array.
 */
export function getAllScenariosList(): (TestScenario | TimelineScenario)[] {
  return [
    ...basicScenarios,
    ...complexScenarios,
    ...timelineScenarios,
    ...edgeCaseScenarios,
    ...stressTestScenarios,
  ];
}

/**
 * Get scenario by ID.
 */
export function getScenarioById(id: string): TestScenario | TimelineScenario | undefined {
  return getAllScenariosList().find(s => s.id === id);
}

/**
 * Get scenarios by tag.
 */
export function getScenariosByTag(tag: string): TestScenario[] {
  return getAllScenariosList().filter(s => s.tags.includes(tag));
}

/**
 * Get all unique tags.
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  getAllScenariosList().forEach(s => {
    s.tags.forEach(t => tags.add(t));
  });
  return Array.from(tags).sort();
}

/**
 * Get scenario count by category.
 */
export function getScenarioCounts(): Record<string, number> {
  return {
    basic: basicScenarios.length,
    complex: complexScenarios.length,
    timeline: timelineScenarios.length,
    edge: edgeCaseScenarios.length,
    stress: stressTestScenarios.length,
    total: getAllScenariosList().length,
  };
}

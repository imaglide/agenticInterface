# Phase C — Static UI Plans

## Summary
Create hardcoded UI Plans for each mode. These are rendered directly without any decision logic—pure visual/interaction testing.

## Dependencies
- Phase A (UI Infrastructure)
- Phase B (Component Library)

## Deliverables

### Static Plan: Neutral Intent
```typescript
const neutralPlan: UIPlan = {
  id: 'static-neutral',
  mode: 'neutral_intent',
  layout: 'stack',
  confidence: 'LOW',
  reason: 'No strong context signals',
  timestamp: Date.now(),
  components: [
    { type: 'NeutralIntentSetter', id: 'intent-input', props: {} },
    { type: 'SuggestedIntents', id: 'suggestions', props: {
      intents: ['Prepare for next meeting', 'Review recent meeting', 'Focus work']
    }},
  ]
};
```

### Static Plan: Meeting Prep
```typescript
const prepPlan: UIPlan = {
  id: 'static-prep',
  mode: 'meeting_prep',
  layout: 'split',
  confidence: 'HIGH',
  reason: 'Meeting starts in 30 minutes',
  timestamp: Date.now(),
  components: [
    { type: 'MeetingHeader', id: 'header', props: { /* mock meeting */ }},
    { type: 'MeetingGoalCard', id: 'goal', props: { goal: '' }},
    { type: 'My3GoalsCard', id: 'my3', props: { goals: [] }},
    { type: 'PrepPromptsCard', id: 'prompts', props: { prompts: [
      'What does success look like?',
      'What might go wrong?',
      'What do you need from others?'
    ]}},
    { type: 'ContextSnippetsCard', id: 'context', props: { collapsed: true }},
  ]
};
```

### Static Plan: Meeting Capture
```typescript
const capturePlan: UIPlan = {
  id: 'static-capture',
  mode: 'meeting_capture',
  layout: 'single',
  confidence: 'HIGH',
  reason: 'Meeting in progress',
  timestamp: Date.now(),
  components: [
    { type: 'GoalsChecklistStrip', id: 'goals-strip', props: { goals: [] }},
    { type: 'CaptureMarkersPanel', id: 'markers', props: {}},
    { type: 'BottomHintBar', id: 'hints', props: { hotkeys: [
      { key: 'd', label: 'Decision' },
      { key: 'a', label: 'Action' },
      { key: 'r', label: 'Risk' },
      { key: 'q', label: 'Question' },
    ]}},
  ]
};
```

### Static Plan: Synthesis
```typescript
const synthesisPlan: UIPlan = {
  id: 'static-synthesis',
  mode: 'meeting_synthesis_min',
  layout: 'stack',
  confidence: 'HIGH',
  reason: 'Meeting ended 10 minutes ago',
  timestamp: Date.now(),
  components: [
    { type: 'MeetingHeader', id: 'header', props: { /* mock meeting */ }},
    { type: 'GoalsOutcomeCard', id: 'outcomes', props: { goals: [] }},
    { type: 'MarkersSummaryCard', id: 'markers', props: { markers: [] }},
    { type: 'NextActionsCard', id: 'actions', props: {}},
  ]
};
```

### Navigation (Temporary)
For this phase only, add temporary dev navigation to switch between static plans. This will be removed when the Rules Engine (Phase F) takes over.

## Spec References
- §6 UI Plan System
- §8 Mode Specifications

## Done Criteria
- [ ] All four static plans defined
- [ ] Each plan renders correctly in its layout
- [ ] Components receive and display mock props
- [ ] Temporary navigation allows switching between plans
- [ ] Prep takes ≤ 2 minutes to review (per §8.2 rule)
- [ ] Capture layout has no unnecessary movement

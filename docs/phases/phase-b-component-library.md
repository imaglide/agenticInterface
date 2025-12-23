# Phase B — Component Library

## Summary
Build all V1 UI components and register them. Each component renders with mock props for visual verification.

## Dependencies
- Phase A (UI Infrastructure)

## Deliverables

### Components by Mode

#### Neutral / Intent Mode (§8.1)
| Component | Purpose |
|-----------|---------|
| `NeutralIntentSetter` | Text input for user intent |
| `SuggestedIntents` | Max 3 clickable suggestions |
| `AdjacentModeSuggestions` | Optional mode switch hints |

#### Meeting Prep Mode (§8.2)
| Component | Purpose |
|-----------|---------|
| `MeetingHeader` | Title, time, attendees |
| `MeetingGoalCard` | Editable meeting goal |
| `My3GoalsCard` | User's 3 personal goals (editable) |
| `PrepPromptsCard` | Max 3 prep prompts |
| `ContextSnippetsCard` | Collapsed context (expandable) |

#### Meeting Capture Mode (§8.4)
| Component | Purpose |
|-----------|---------|
| `CaptureMarkersPanel` | Decision/Action/Risk/Question buttons |
| `GoalsChecklistStrip` | My3Goals as small checklist |
| `BottomHintBar` | Hotkey hints |
| `MarkerLabelInput` | Optional 3-5 word label |

#### Post-Meeting Synthesis (§8.5)
| Component | Purpose |
|-----------|---------|
| `MeetingHeader` | (reused) |
| `GoalsOutcomeCard` | Achieved / Not achieved |
| `MarkersSummaryCard` | Grouped by type |
| `NextActionsCard` | Follow-up email / intent |

### Component Requirements

All components must:
- Accept props defined in UIPlan schema
- Be stateless where possible (state lives in parent/context)
- Support stable IDs for stability rules
- Not reorder themselves after initial render

### Marker Types (§8.4)
```typescript
type MarkerType = 'decision' | 'action' | 'risk' | 'question';
```

### My3Goals Rules (§8.3)
- Max 3 goals
- Written by user
- Editable until meeting starts
- Shown in prep, capture, and synthesis
- One-click check marks achievement (records timestamp)

## Spec References
- §8 Mode Specifications (all subsections)
- §8.3 "My 3 Goals" (Throughline)

## Done Criteria
- [ ] All components listed above exist
- [ ] Each component renders with mock props
- [ ] Component registry is populated
- [ ] Storybook or equivalent for visual review (optional)
- [ ] No component performs layout reordering

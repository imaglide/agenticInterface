# Phase F — Rules Engine

## Summary
Implement the decision engine that selects modes based on context, enforces stability rules, and produces Decision Capsules.

## Dependencies
- Phase A (UI Infrastructure)
- Phase D (Persistence)
- Phase E (Dev Harness) — for testing

## Deliverables

### 1. Context Engine

Reads calendar state and computes meeting context.

```typescript
interface MeetingContext {
  currentMeeting: CalendarEvent | null;  // if live
  nextMeeting: CalendarEvent | null;     // within prep window
  lastMeeting: CalendarEvent | null;     // within synthesis window
  now: number;
}

function computeMeetingContext(
  events: CalendarEvent[],
  now: number,
  config: TimingConfig
): MeetingContext;
```

### 2. Timing Configuration (§4.1)

```typescript
interface TimingConfig {
  prepWindowMinutes: number;      // default: 45
  synthesisWindowMinutes: number; // default: 60
  meetingGraceMinutes: number;    // grace for start/end
}
```

### 3. Mode Selection (§4.2)

Priority order: `CAPTURE > PREP > SYNTHESIS > NEUTRAL`

```typescript
function selectMode(context: MeetingContext): {
  mode: Mode;
  confidence: Confidence;
  reason: string;
  trigger: string;
} {
  // 1. Check if meeting is live → CAPTURE
  // 2. Check if next meeting within prep window → PREP
  // 3. Check if last meeting within synthesis window → SYNTHESIS
  // 4. Otherwise → NEUTRAL
}
```

### 4. Confidence Assignment (§7)

| Level | Criteria |
|-------|----------|
| HIGH | Single strong trigger, no competing higher-priority trigger |
| MEDIUM | Trigger exists but competing trigger one level below |
| LOW | No strong triggers |

```typescript
function assignConfidence(
  mode: Mode,
  context: MeetingContext
): Confidence;
```

### 5. Safe Boundary Enforcement (§4.3)

```typescript
interface StabilityState {
  currentPlan: UIPlan;
  lastSwitchTime: number;
  isInputFocused: boolean;
  minimumHoldMs: number;  // per plan
}

function canAutoSwitch(
  proposed: Mode,
  current: StabilityState,
  trigger: SwitchTrigger
): boolean {
  // Allowed triggers:
  // - app_open
  // - meeting_boundary_change
  // - explicit_user_action

  // NOT allowed:
  // - blur/focus
  // - idle timeout
  // - background polling
  // - tab visibility

  // Mid-edit lockout:
  if (current.isInputFocused) return false;

  // Minimum hold time:
  if (Date.now() - current.lastSwitchTime < current.minimumHoldMs) return false;

  return ALLOWED_TRIGGERS.includes(trigger);
}

type SwitchTrigger =
  | 'app_open'
  | 'meeting_boundary_change'
  | 'explicit_user_action'
  | 'blur_focus'        // blocked
  | 'idle_timeout'      // blocked
  | 'background_poll'   // blocked
  | 'tab_visibility';   // blocked
```

### 6. Decision Capsule (§7)

```typescript
interface DecisionCapsule {
  viewLabel: string;
  confidence: Confidence;
  reason: string;
  signalsUsed: string[];
  alternativesConsidered: Alternative[];  // max 3
  wouldChangeIf: string[];
  actions: CapsuleAction[];
}

interface Alternative {
  mode: Mode;
  reason: string;
}

interface CapsuleAction {
  type: 'switch_view' | 'set_intent';
  label: string;
  target?: Mode;
}
```

### 7. Adjacency Suggestions (§4.2)

When Prep wins over Synthesis due to priority:

```typescript
function getAdjacencySuggestion(
  selectedMode: Mode,
  context: MeetingContext
): AdjacencySuggestion | null {
  if (selectedMode === 'meeting_prep' && context.lastMeeting) {
    return {
      label: 'Review last meeting outcomes',
      targetMode: 'meeting_synthesis_min',
    };
  }
  return null;
}
```

### 8. Rules Engine Integration

```typescript
class RulesEngine {
  constructor(
    private timingConfig: TimingConfig,
    private storage: StorageAPI
  ) {}

  async evaluateContext(
    events: CalendarEvent[],
    trigger: SwitchTrigger
  ): Promise<{
    plan: UIPlan;
    capsule: DecisionCapsule;
    shouldSwitch: boolean;
  }>;
}
```

## Spec References
- §4.1 Timing Rules
- §4.2 Mode Priority
- §4.3 Safe Boundaries for Mode Switches
- §5 Agentic UI Architecture
- §6.3 Stability Rules
- §6.4 State Transition Diagram
- §7 Decision Capsule (Trust Layer)

## Done Criteria
- [ ] Context engine correctly identifies meeting state
- [ ] Mode selection follows priority order
- [ ] Confidence assignment matches criteria
- [ ] Safe boundary checks block inappropriate switches
- [ ] Mid-edit lockout prevents switches while typing
- [ ] Decision Capsule is generated for every plan
- [ ] Adjacency suggestions appear when appropriate
- [ ] "Why this view?" panel displays capsule contents
- [ ] All transitions match state diagram (§6.4)

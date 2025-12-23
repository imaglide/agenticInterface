# Phase E — Dev Harness

## Summary
Build a sidebar tool for stress-testing the agentic UI without real integrations. Hidden behind a flag, never shipped to users.

## Dependencies
- Phase A (UI Infrastructure)
- Phase B (Component Library)
- Phase C (Static UI Plans)
- Phase D (Persistence)

## Deliverables

### 1. Sidebar Panel

Collapsible sidebar with developer controls. Activated via:
- URL param: `?dev=true`
- Keyboard shortcut: `Cmd+Shift+D` (dev only)

### 2. Controls

#### Mode Control
```
[Force Mode]
○ Neutral/Intent
○ Meeting Prep
○ Meeting Capture
○ Synthesis
[Apply]
```

#### Meeting Simulation
```
[Simulate Meeting State]
Meeting starts in: [____] minutes
Meeting duration:  [____] minutes
[Start Simulation]

Current state: [No meeting / Prep / Live / Ended]
```

#### Goals Injection
```
[Inject Sample Goals]
□ "Get alignment on timeline"
□ "Understand blockers"
□ "Confirm next steps"
[Inject Selected]
```

#### Marker Injection
```
[Add Test Marker]
Type: [Decision ▼]
Label: [________]
[Add]
```

#### Hydration Control
```
[Slow Hydration Mode]
□ Enabled (500ms delay per component)
```

#### Plan Inspector
```
[Current Plan] (read-only)
─────────────────────────
Mode: meeting_prep
Layout: split
Confidence: HIGH
Reason: "Meeting starts in 30 minutes"

Components:
  - MeetingHeader (header)
  - MeetingGoalCard (goal)
  - My3GoalsCard (my3)
  ...
```

### 3. Data Durability Warning (§10)

Persistent banner at top of dev harness:
```
⚠️ DEV: Local-only storage (IndexedDB). Clearing site data wipes history.
```

### 4. Event Log Viewer

```
[Event Log] (last 50)
─────────────────────────
12:34:01  mode_switched      → meeting_prep
12:34:02  plan_rendered
12:35:15  my3_goal_added     "Get alignment"
12:36:42  marker_created     decision
...
[Export JSON]
```

### 5. Time Override

```
[Override Current Time]
□ Enabled
Date: [2024-01-15]
Time: [14:30]

Useful for testing:
- Prep window boundaries
- Meeting start/end transitions
- Synthesis window expiry
```

## Implementation Notes

### Flag Guard
```typescript
const DEV_HARNESS_ENABLED =
  process.env.NODE_ENV === 'development' ||
  new URLSearchParams(window.location.search).has('dev');
```

### Never Ship
- Exclude from production builds
- Remove component entirely before external testing
- No references to dev harness in production code paths

## Spec References
- §10 Dev Harness Sidebar (Founder Tool)

## Done Criteria
- [ ] Sidebar renders when flag enabled
- [ ] Force mode switch works
- [ ] Meeting simulation creates realistic state transitions
- [ ] Goal injection populates My3GoalsCard
- [ ] Marker injection adds to current meeting
- [ ] Slow hydration mode adds visible delays
- [ ] Plan inspector shows current plan accurately
- [ ] Durability warning is visible
- [ ] Event log displays recent events
- [ ] Time override affects context calculations
- [ ] Hidden in production builds

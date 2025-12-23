# Agentic Interface V1 — Design & Implementation Specification

## Status
**V1 Scope Locked**  
Web-first • UI-first • Context + Agentic • Calendar-only • Minimal Post-Meeting Synthesis

---

## 1. Purpose of V1

The goal of V1 is to prove the core product thesis is **not fragile**:

1. A system can **choose the correct UI for the moment** based on context.
2. Users will accept an **agent-driven interface** without menus or navigation.
3. UI transitions can feel **calm and intentional**, not janky.
4. A closed loop of **Prep → Meeting → Synthesis** provides real value.
5. User-entered intent and behavior meaningfully influence future UI.

V1 is **not** about automation depth or AI power.  
It is about **trust, flow, and correctness of UI selection**.

---

## 2. Core Product Principles

- **UI is the product** — not chat, not workflows.
- **Agent decides the UI**, user supervises.
- **Context first, intent second**.
- **Low confidence never guesses**.
- **No menus**. No navigation trees.
- **Everything is inspectable** (“Why this view?”).
- **Stability beats cleverness**.

---

## 3. V1 Modes (Locked)

### Modes included
- `neutral_intent`
- `meeting_prep`
- `meeting_capture`
- `meeting_synthesis_min`

### Modes explicitly out of scope
- Work UI
- Working Meeting UI
- Gmail / Email integration
- Transcripts
- Tasks systems
- Notion / Todoist
- Browser extension / attention firewall

---

## 4. Context Hierarchy (V1)

Calendar is the **only strong context source**.

### Strong contexts
1. **Meeting Capture**
   - Now is within meeting start/end window (+ grace)
2. **Meeting Prep**
   - Next meeting starts within prep window (default: 45 min)
3. **Post-Meeting Synthesis**
   - Last meeting ended within synthesis window (default: 60 min)

### Weak / no context
- None of the above → show **Neutral / Intent**

**Rule:**
If context is weak or ambiguous, do **not** guess. Ask for intent.

---

### 4.1 Timing Rules

#### Prep Window
- Starts exactly **T minutes** before meeting start (default T = 45)
- No additional grace period — boundary is deterministic
- If user opens at T-1 (44 min before): **Prep**
- If user opens at T+1 (46 min before): **Neutral/Intent**

#### Synthesis Window
- Starts when meeting ends
- Lasts **S minutes** (default S = 60)

---

### 4.2 Mode Priority

When multiple context windows overlap (e.g., back-to-back meetings), use this priority:

```
CAPTURE > PREP > SYNTHESIS > NEUTRAL
```

| Priority | Mode | Trigger |
|----------|------|---------|
| 1 | `meeting_capture` | Current time within meeting start/end + grace |
| 2 | `meeting_prep` | Next meeting starts within prep window |
| 3 | `meeting_synthesis_min` | Last meeting ended within synthesis window |
| 4 | `neutral_intent` | No strong triggers |

**Overlap handling:**
If synthesis window (Meeting A) overlaps prep window (Meeting B), **Prep wins**.
Rationale: upcoming meeting is more urgent than reviewing past meeting.

**Adjacency suggestion:**
When Prep wins over Synthesis, show a subtle suggestion:
> "Review last meeting outcomes"
User can switch to Synthesis manually.

---

### 4.3 Safe Boundaries for Mode Switches

Auto-switches occur **only** at safe boundaries to prevent surprise UI changes.

#### Allowed auto-switch triggers (V1)
- App open / refresh
- Meeting boundary change:
  - upcoming → live
  - live → ended
- Explicit user action:
  - "Switch view" button
  - Clicking a suggested adjacent view

#### NOT safe boundaries (V1)
- Blur/focus events
- Idle timeout
- Background polling updates
- Tab visibility changes

**Mid-edit lockout:**
Never auto-switch while any input element is focused.

---

## 5. Agentic UI Architecture

### 5.1 Layers

1. **Context Engine**
   - Reads calendar snapshot
   - Computes meeting state

2. **Behavior Engine**
   - Records user actions:
     - edits
     - goal checks
     - markers
     - overrides
     - feedback

3. **Decision Engine**
   - Chooses mode
   - Chooses UI Plan variant
   - Assigns confidence (HIGH / MED / LOW)

4. **Renderer**
   - Validates UI Plan schema
   - Renders deterministic components
   - Enforces stability rules

---

## 6. UI Plan System

### 6.1 Deterministic UI Plans

- UI is composed from a **finite component library**
- Agent/rules select components + props
- Agent **never generates UI code**

**Component Registry (V1):**
- Static mapping — no A/B testing at registry level
- Variants achieved at the plan level via different props (e.g., prompt wording, collapsed state)
- Optional `variant_id` inside props if needed for tracking
- Rationale: registry versioning adds complexity before you have users

### 6.2 Layout Templates

- `stack` — single column (Neutral, Synthesis)
- `split` — context left / action right (Prep)
- `single` — minimal canvas (Capture)

### 6.3 Stability Rules (Anti-Jank)

- No component reordering after render
- Mode switches only at **safe boundaries** (see §4.3)
- No mode switches while user is typing
- Each plan has a minimum hold time
- Low confidence never auto-switches

---

### 6.4 State Transition Diagram

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
    ┌───────────────────────────┐                             │
    │      NEUTRAL_INTENT       │◄────────────────────────────┤
    │   (no strong triggers)    │                             │
    └───────────────────────────┘                             │
                    │                                         │
                    │ meeting within prep window              │
                    ▼                                         │
    ┌───────────────────────────┐                             │
    │       MEETING_PREP        │                             │
    │  (T-45min to T-0)         │                             │
    └───────────────────────────┘                             │
                    │                                         │
                    │ meeting starts (boundary change)        │
                    ▼                                         │
    ┌───────────────────────────┐                             │
    │     MEETING_CAPTURE       │                             │
    │   (during meeting)        │  ◄─── highest priority      │
    └───────────────────────────┘                             │
                    │                                         │
                    │ meeting ends (boundary change)          │
                    ▼                                         │
    ┌───────────────────────────┐                             │
    │  MEETING_SYNTHESIS_MIN    │─────────────────────────────┘
    │   (post-meeting, ≤60min)  │     synthesis window expires
    └───────────────────────────┘     OR prep window opens
```

**Transitions allowed only at safe boundaries (§4.3).**

---

## 7. Decision Capsule (Trust Layer)

Every rendered plan produces a **Decision Capsule**.

### Capsule contains
- View label
- Confidence (HIGH / MED / LOW)
- One-line reason
- Signals used
- Alternatives considered (max 3)
- “Would change if” list
- Actions:
  - Switch view
  - Set intent

### UI
- Accessed via **"Why this view?"**
- Slide-over panel
- Human-readable only (no numbers)

### Confidence Criteria

| Level | Criteria | Behavior |
|-------|----------|----------|
| **HIGH** | Single strong trigger with no competing trigger at higher priority | Auto-switch allowed at safe boundaries |
| **MEDIUM** | Trigger exists but competing trigger one priority level below | Auto-switch allowed; show alternative in capsule |
| **LOW** | No strong triggers | No auto-switch; require user intent |

**Examples:**
- Meeting live, no other triggers → **HIGH** (Capture)
- Meeting in 30min, last meeting ended 20min ago → **HIGH** (Prep wins by priority)
- No meetings within windows → **LOW** (Neutral, ask for intent)

Confidence level is shown only in the "Why this view?" capsule, never in primary UI.

---

## 8. Mode Specifications

### 8.1 Neutral / Intent Mode

**Purpose**
- Safest fallback when context is weak

**UI Components**
- NeutralIntentSetter
- Suggested intents (max 3)
- Optional adjacent mode suggestions

**Behavior**
- User selects or types intent
- Intent is recorded
- Agent renders a new plan based on intent

---

### 8.2 Meeting Prep Mode

**Purpose**
- Orient the user
- Clarify success criteria
- Avoid over-prep

**Key Components**
- MeetingHeader
- MeetingGoalCard (editable)
- My3GoalsCard (max 3)
- PrepPromptsCard (max 3)
- ContextSnippetsCard (collapsed)

**Rules**
- Prep should take ≤ 2 minutes
- No checklists
- No document browsing
- No task management

---

### 8.3 “My 3 Goals” (Throughline)

**Definition**
Personal success criteria for the meeting.

**Rules**
- Max 3
- Written by the user
- Editable until meeting starts
- Shown in prep, meeting, and synthesis

**During Meeting**
- Appears as a small checklist strip
- One-click check marks achievement
- Records timestamp event

---

### 8.4 Meeting Capture Mode

**Purpose**
- Help user *notice* key moments
- Preserve presence

**Primary UI**
- CaptureMarkersPanel
- GoalsChecklistStrip
- BottomHintBar (hotkeys)

**Markers**
- Decision
- Action
- Risk
- Question

**Rules**
- One click or hotkey
- Optional short label (3–5 words)
- No transcript
- No summaries
- No layout movement

---

### 8.5 Post-Meeting Synthesis (Minimal)

**Purpose**
- Close the loop
- Make outcomes explicit

**Trigger**
- Meeting ends OR user exits capture

**Components**
- MeetingHeader
- GoalsOutcomeCard
  - Achieved / Not achieved
- MarkersSummaryCard
  - Grouped by type
- NextActionsCard
  - Draft follow-up email
  - Create follow-up intent

**Rules**
- No transcript
- No AI-written summary
- No task system

---

## 9. Intent Capture & Ledger (V1 Minimal)

### 9.1 Intent Sources
- Meeting Goal edits
- My 3 Goals entries
- Prep prompt answers
- Marker labels
- Follow-up creation from synthesis
- Neutral intent selection

### 9.2 IntentItem (Conceptual)
- id
- scope (meeting / session)
- type (goal, question, data_need, action, note)
- text
- status (open / satisfied / deferred)

### 9.3 Event Log (Append-only)
Minimum events:
- plan_rendered
- mode_switched
- capsule_opened
- meeting_goal_updated
- my3_goal_added / updated / deleted
- goal_checked
- marker_created / labeled
- synthesis_completed
- intent_created / status_changed
- thumb_feedback

Persistence: **IndexedDB only** in V1.

### 9.4 Event Log Retention & Compaction

V1 uses append-only storage with lightweight compaction. No TTL.

#### Semantic events (keep forever locally)
- Goals (my3, meeting goals)
- Markers
- Intent items
- Synthesis outcomes
- Mode switches
- Capsule opens

#### Noise events (compact)
- plan_rendered
- Minor UI telemetry

**Compaction rules:**
- Keep last **30 days** OR last **10,000 events** (whichever smaller)
- Summarize older noise into daily aggregates:
  - Counts of renders by mode
  - Override counts
  - Capsule open counts

Rationale: preserve history for debugging behavior without unbounded IndexedDB growth.

---

## 10. Dev Harness Sidebar (Founder Tool)

**Purpose**
- Stress-test agentic UI without real integrations

**Features**
- Force mode switch
- Simulate meeting states
- Inject sample goals
- Add markers
- Toggle slow hydration
- Inspect current plan (read-only)

**Rules**
- Hidden behind flag
- Never shipped to users
- Removed before external testing

**Data Durability Warning**
Dev harness displays a persistent banner:
> "DEV: Local-only storage (IndexedDB). Clearing site data wipes history."

---

## 11. Calendar Integration (V1)

**Scope**
- Google Calendar
- Read-only
- Events for today + next 24h

**Usage**
- Determine meeting state
- Populate MeetingHeader
- Drive mode selection on app open

No Gmail in V1.

---

## 12. AI Readiness (Day 1)

V1 can ship **rules-only**.

When LLMs are added:
- LLM fills content (meeting goal inference, prompt selection)
- LLM never generates UI code
- UI Plan schema remains authoritative
- Default model: lightweight (e.g., GPT-4o-mini)
- Escalation only for high-stakes text

MCP / A2A readiness achieved via:
- deterministic schemas
- stable component IDs
- explicit tool boundaries

---

## 13. Meeting Hygiene & Agentic Hygiene (Implicit)

The system **rewards clarity** instead of enforcing rules:
- Clear goals → better prep UI
- Clear decisions → cleaner synthesis
- Ambiguity → visible gaps, not errors

No blocking. No scolding.

---

## 14. V1 Explicitly Out of Scope

- Live transcription
- Transcript ingestion
- Gmail integration
- Automatic task creation
- External system writes
- Work UI
- Working Meeting UI
- Browser extensions
- Collaboration / sharing

---

## 15. Implementation Phases

See [phases/README.md](./phases/README.md) for full implementation plans.

| Phase | Name | Summary |
|-------|------|---------|
| A | [UI Infrastructure](./phases/phase-a-ui-infrastructure.md) | Next.js, schemas, renderer, layouts |
| B | [Component Library](./phases/phase-b-component-library.md) | All V1 components |
| C | [Static UI Plans](./phases/phase-c-static-ui-plans.md) | Hardcoded plans for each mode |
| D | [Persistence](./phases/phase-d-persistence.md) | IndexedDB, event log, state |
| E | [Dev Harness](./phases/phase-e-dev-harness.md) | Founder testing tool |
| F | [Rules Engine](./phases/phase-f-rules-engine.md) | Context → mode selection |
| G | [Calendar Integration](./phases/phase-g-calendar-integration.md) | Google Calendar OAuth |
| H | [Founder Test](./phases/phase-h-founder-test.md) | 1 week daily use validation |

---

## 16. Definition of Success (V1)

V1 succeeds if:
- You prefer opening this over your current system
- You trust the first screen
- You don’t look for menus
- Prep, capture, and synthesis feel calm
- You feel “closed” after meetings

If that’s true, the product is **not fragile**.

---

## End of Document

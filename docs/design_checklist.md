# Agentic Interface — Master Design & Implementation Checklist

This checklist enumerates every requirement, decision, constraint, and non-goal specified during design.
Use it as an implementation tracker, review/audit gate, and “nothing forgotten” safety net.

---

## 1. Core Product Thesis

- [x] UI is agent-selected, not user-navigated
- [x] Intent + context determine the workspace
- [x] Low confidence never guesses
- [x] Human is supervisor, not operator
- [x] UI decisions are inspectable (“Why this view?”)
- [x] No menus, no dashboards, no static apps
- [x] Stability > cleverness (no thrash)

---

## 2. Context & Mode System (V1)

### 2.1 Modes
- [x] Neutral / Intent
- [x] Meeting Prep
- [x] Meeting Capture
- [x] Post-Meeting Synthesis (minimal)

### 2.2 Mode Priority & Windows
- [x] Priority enforced: Capture > Prep > Synthesis > Neutral
- [x] Prep window uses an exact boundary (default: 45 min)
- [x] Synthesis window uses an exact boundary (default: 60 min)
- [x] Overlapping windows resolved deterministically

### 2.3 Stability Guards
- [x] Minimum hold time per mode implemented
- [x] No switching during mid-edit (focused input blocks switches)
- [x] Mode changes only at safe boundaries:
  - [x] App open / refresh
  - [x] Meeting boundary change (upcoming → live → ended)
  - [x] Explicit user action (switch view / suggestion click)
- [x] No switching on blur / idle timeout / tab visibility change
- [x] Dream/cloud transition on mode change
- [x] Layout does not reorder after render

---

## 3. Decision Capsule (Trust Layer)

- [x] Capsule generated for every rendered plan
- [x] Capsule includes:
  - [x] view label
  - [x] confidence (HIGH/MED/LOW only)
  - [x] one-line reason
  - [x] signals used (facts, max 6)
  - [x] alternatives considered (max 3)
  - [x] “would change if” (max 3)
- [x] Confidence is human-label only (no numeric confidence exposed)
- [x] Capsule accessible via “Why this view?” (slide-over panel)
- [x] LOW confidence never auto-selects a mode (falls back to intent UI)

---

## 4. Meeting System (V1)

### 4.1 Prep
- [x] Editable meeting goal (“What this meeting is about”)
- [x] My 3 Goals (max 3, personal)
- [x] Prep prompts (max 3, one-line answers)
- [x] Context snippets collapsed by default

### 4.2 Capture
- [x] Marker types implemented:
  - [x] Decision
  - [x] Action
  - [x] Risk
  - [x] Question
- [x] Keyboard-first capture (DARQ hotkeys)
- [x] No transcript UI during meeting
- [x] Goals checklist visible during meeting
- [x] Minimal, distraction-free layout (single/canvas)

### 4.3 Synthesis (Minimal)
- [x] Goals shown as achieved vs not achieved
- [x] Markers summarized/grouped by type
- [x] Next actions available:
  - [x] Draft follow-up (local draft, no auto-send)
  - [x] Create follow-up intent
- [x] No transcript processing
- [x] No LLM-written long summary required for V1
- [x] No task system integration in V1

---

## 5. Stable Meeting Identity

- [x] Internal `meeting_uid` generated on first encounter
- [x] iCalUID used as primary identity key for mapping
- [x] eventId stored as secondary locator
- [x] Mapping persisted includes:
  - [x] meeting_uid
  - [x] provider
  - [x] iCalUID
  - [x] eventId
  - [x] calendarId
  - [x] start_time_iso (recurring instance disambiguation)

---

## 6. WorkObject System (Semantic Backbone)

### 6.1 Principles
- [x] Any interactive element is a WorkObject
- [x] UI chrome is not a WorkObject
- [x] WorkObjects are stable, inspectable, and event-referenced
- [x] Agent reasons over WorkObjects, not pixels

### 6.2 Included WorkObject Types
- [x] meeting
- [x] meeting_goal
- [x] goal (slots g1–g3)
- [x] marker
- [x] note
- [x] group
- [x] link
- [x] (future) workspace, dataset, record, finding, insight, filter

---

## 7. WorkObject ID Scheme

### 7.1 Canonical Format
- [x] `wo:<type>:<scope>:<local_id>`

### 7.2 Scope Rules
- [x] Meeting scope: `mtg:<meeting_uid>`
- [x] Workspace scope (future): `ws:<workspace_uid>`

### 7.3 ID Rules
- [x] Deterministic IDs for meetings, goal slots, markers
- [x] UUIDs only for notes, groups, links
- [x] No versioned IDs in the ID string (reject `wo:v1:...`)
- [x] Cross-scope linking disallowed in V1

---

## 8. Goal Slot Semantics

- [x] g1/g2/g3 are permanent identities
- [x] Goal deletion uses tombstone (`deletedAtIso`)
- [x] Slot preserved even if empty
- [x] Re-adding goal reuses the same WorkObject ID
- [x] Slot identity > goal text

---

## 9. Marker Counter Semantics

- [x] Per-meeting monotonic counter stored in IndexedDB
- [x] Counter increments only
- [x] Counter never resets (even if marker deleted)
- [x] Marker IDs append-only (m1, m2, m3…)
- [x] Single-device / single-writer assumption documented for V1

---

## 10. Tombstones & Deletion

- [x] No hard deletes
- [x] `deletedAtIso` supported for WorkObjects and WorkLinks
- [x] Deleted objects hidden from UI
- [x] Links/notes referencing deleted objects remain valid
- [x] UI indicates “(deleted)” when referenced

---

## 11. Flags (Normalized)

- [x] Flags are not stored inside WorkObject payload
- [x] Separate flag records keyed by WorkObject ID
- [x] Flag types:
  - [x] important
  - [x] risk
  - [x] followup
- [x] `flag_toggled` event emitted
- [x] `set_by` tracked (user vs agent_suggestion)

---

## 12. Links & Relationships

- [x] Link types limited to:
  - [x] related
  - [x] supports
  - [x] blocks
  - [x] duplicates
- [x] Links are first-class objects (and tombstone-able)
- [x] Cross-scope linking disallowed in V1

---

## 13. Universal Interaction Model

### 13.1 Object Action Menu
- [x] Same menu for all WorkObjects
- [x] Actions:
  - [x] add note
  - [x] flag
  - [x] link to…
  - [x] group with…
  - [x] ask agent about this
  - [x] create follow-up intent
- [x] Availability varies by object type (menu stays consistent)

### 13.2 Linking Mode
- [x] Explicit entry via “Link to…”
- [x] Persistent hint bar
- [x] Exit on:
  - [x] success
  - [x] Esc
  - [x] navigation to another mode
  - [x] inactivity timeout (10s)
- [x] Clicking non-WorkObject is a no-op with user feedback

---

## 14. Notes

- [x] Notes are first-class WorkObjects
- [x] Notes may target multiple objects
- [x] Notes appear once in a Notes panel (not duplicated)
- [x] Objects show note-count badges
- [x] Clicking badge filters Notes panel

---

## 15. Groups

- [x] Groups are WorkObjects
- [x] Single-scope only (per meeting scope in V1)
- [x] Members must share scope
- [x] Groups can be collapsed/labeled
- [x] Groups usable in synthesis
- [x] Cross-meeting groups deferred to work surfaces

---

## 16. Synthesis Semantics

- [x] Synthesis does not create new synthesis WorkObjects in V1.5
- [x] Goal outcomes derived from goal state
- [x] Marker summaries derived from markers/groups

---

## 17. Agent Permissions

- [x] Agent is read-only for WorkObjects
- [x] Agent may suggest notes/links/groups
- [x] User must confirm creation
- [x] Agent cannot mutate structure autonomously

---

## 18. Event Log

- [x] All interactions emit events
- [x] Events reference WorkObject IDs
- [x] Core events include:
  - [x] note_created
  - [x] flag_toggled
  - [x] link_created
  - [x] group_created
  - [x] goal_checked
  - [x] marker_created
  - [x] object_deleted

---

## 19. Persistence & Sync

- [x] IndexedDB authoritative in V1/V1.5
- [x] Single-device only
- [x] No sync/merge in V1/V1.5
- [x] Explicitly documented limitation

---

## 20. Performance & Scale Limits

- [x] Max per meeting:
  - [x] 100 markers
  - [x] 200 notes
  - [x] 300 links
- [x] Soft warnings at 75%
- [x] Suggest moving to work surface when exceeded
- [x] IndexedDB indexed by meeting_uid and object_id (or equivalent keys)

---

## 21. External Data Ownership

- [x] WorkObjects store external pointers via `dataRef`
- [x] External deletion detected lazily
- [x] WorkObject marked stale
- [x] UI shows “Source unavailable”
- [x] No auto-delete

---

## 22. Testing & Validation

- [x] Playwright MCP test suite exists and is runnable
- [x] Mock calendar + email provider exists (scenario loader)
- [x] Founder Test Dashboard exists (metrics from events)
- [x] No-harness mode exists
- [x] Agent-based testers exist:
  - [x] Skeptical Executive Assistant
  - [x] Speedrunner
  - [x] Chaos Gremlin
  - [x] Calm Operator
  - [x] Overloaded Manager
  - [x] Methodical Newcomer
  - [x] Privacy Paranoid
  - [x] ADHD Founder
- [x] Per-agent scoring and per-agent release gating implemented

---

## 23. Agentic Work Surfaces (Next Phase)

- [ ] Intent → workspace compiler
- [ ] Clarification loop (max 1–2 questions)
- [ ] Data ingest panel (upload/connectors)
- [ ] Lens selection (compliance/risk/etc.)
- [ ] Interactive table/canvas
- [ ] Insights grounded in data
- [ ] Universal WorkObject interaction reused
- [ ] Work surfaces are disposable (snapshots optional)

---

## 24. Explicit Non-Goals

- [x] No app builder
- [x] No infinite canvas
- [x] No arbitrary schemas per surface
- [x] No silent persistence
- [x] No hallucinated structure

---

## Completion Definition

When every box in this file is checked, the system qualifies as:

> A semantic, agent-driven interface that compiles intent into the right workspace—while keeping humans firmly in control.

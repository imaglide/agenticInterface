WorkObjects & Agentic Work Surfaces

Design and Implementation Plan (Updated, Locked, Patched)

Status

Planned for post-V1 (incremental rollout)
Foundational for: Work Surfaces, Agent Reasoning, Advanced Intent Handling

All known risks, ambiguities, and open questions have been explicitly resolved.

1. Purpose

This document defines the semantic interaction layer for the agentic interface.

The goal is to ensure that:

Any meaningful UI element a user can interact with is represented as a WorkObject

Users can annotate, flag, link, and group any displayed element

The agent can reason over user-created structure, not just raw data

Existing meeting UI and future “work surfaces” share the same interaction model

Work surfaces feel like agent-assembled, ephemeral Quickbase-style apps driven by intent

This is not a canvas system, a diagram tool, or an app builder.

2. Core Principle (Locked)

If the user can act on it, it must be a WorkObject.
If the user cannot act on it, it is UI chrome.

WorkObjects form the semantic graph that underlies all agent reasoning.

3. What Becomes a WorkObject
Included (V1 + V1.5)

Meeting (internal meeting UID)

Meeting goal (“What this meeting is about”)

My 3 Goals (each goal slot)

Markers (Decision / Action / Risk / Question)

User notes

User-defined groups

Links between any of the above

Explicitly Excluded

Top bar

Layout containers

Dream/cloud transition

Static labels

Decorative UI

4. Stable Meeting Identity (Critical)
4.1 iCalUID vs eventId (Locked)

Primary identity: iCalUID
Secondary locator: eventId

Google Calendar eventId is not stable enough to use as semantic identity.
iCalUID is designed for identity continuity and is more stable across edits.

Decision

On first encounter with a calendar event:

Generate:

meeting_uid = uuid()


Persist mapping:

{
  meeting_uid,
  provider: "gcal",
  ical_uid,        // primary identity
  event_id,        // secondary locator
  calendar_id,
  start_time_iso   // for recurring instance disambiguation
}

WorkObject scope

All meeting-scoped WorkObjects use:

mtg:<meeting_uid>


External IDs are stored only in dataRef.

5. WorkObject ID System (Canonical)
Format
wo:<type>:<scope>:<local_id>

Examples

Meeting

wo:meeting:mtg:<meeting_uid>


Meeting goal

wo:meeting_goal:mtg:<meeting_uid>


My 3 Goals (fixed slots)

wo:goal:mtg:<meeting_uid>:g1
wo:goal:mtg:<meeting_uid>:g2
wo:goal:mtg:<meeting_uid>:g3


Markers (monotonic counter per meeting)

wo:marker:mtg:<meeting_uid>:m1
wo:marker:mtg:<meeting_uid>:m2


Notes / Groups / Links (UUID-based)

wo:note:mtg:<meeting_uid>:<uuid>
wo:group:mtg:<meeting_uid>:<uuid>
wo:link:mtg:<meeting_uid>:<uuid>


Workspace (future)

wo:workspace:ws:<workspace_uid>

Rules (Locked)

Deterministic IDs for meetings, goals, markers

UUIDs only for notes, groups, links

IDs are stable across reloads and sessions

Versioned IDs (wo:v1:...) explicitly rejected

6. Goal Slot Semantics (Locked)
Deletion Behavior

Goal slots are preserved and never reused.

g1, g2, g3 are permanent identities

Deleting a goal sets deletedAtIso

Slot remains empty until reused

Re-adding a goal:

clears content

updates timestamps

retains the same WorkObject ID

Rationale

Slot is the identity

Text is state

Prevents ID churn

Simplifies linking, history, and agent reasoning

7. Marker Counter Semantics (Locked)

Markers use a per-meeting monotonic counter.

Decision

Counter stored in:

meeting_state[meeting_uid].marker_counter


Incremented on creation

Never reset

Marker IDs are append-only (m1, m2, m3…)

Concurrency

V1 is single-client only

No concurrent writers

Multi-device sync explicitly out of scope

8. WorkObject Data Model
WorkObject {
  id: string;
  type: string;
  source: "user" | "agent" | "system";
  title?: string;
  dataRef?: string;
  payload?: Record<string, any>;
  createdAtIso: string;
  updatedAtIso: string;
  deletedAtIso?: string;  // tombstone (locked)
}

Tombstones (Locked)

Objects are never hard-deleted

deletedAtIso hides from UI

Links and notes remain valid

UI displays “(deleted)” when referenced

9. Flags (Locked Design)

Flags are not embedded in WorkObject payloads.

Decision

Flags are stored as separate normalized records keyed by WorkObject ID.

Flag {
  work_object_id: string;
  flag_type: "important" | "risk" | "followup";
  is_set: boolean;
  set_at_iso: string;
  set_by: "user" | "agent_suggestion";
}

Events

flag_toggled(work_object_id, flag_type, is_set)

Rationale

Flags are cross-cutting metadata

Easier querying and auditing

Avoids payload merge conflicts

10. Links (Relationships)
WorkLink {
  id: string;
  fromId: string;
  toId: string;
  type: "related" | "supports" | "blocks" | "duplicates";
  createdAtIso: string;
  deletedAtIso?: string;
}

Cross-Scope Linking (Locked)

Disallowed in V1

All linked objects must share the same mtg:<meeting_uid> scope

Cross-meeting links deferred to Work Surfaces only

11. Universal Object Interaction Model
Object Action Menu (Same Everywhere)

Add note

Flag

Link to…

Group with…

Ask agent about this

Create follow-up intent

Menu is consistent; availability varies by type.

12. Linking Mode UX (Locked)

Explicit entry via “Link to…”

Persistent hint bar:

“Select an item to link · Esc to cancel”

Exit conditions:

link created

Esc

navigation to another mode

10s inactivity timeout

Clicking non-WorkObject is a no-op with feedback

No partial state persisted.

13. Notes as First-Class Objects (Locked)

Notes exist once in a Notes panel

WorkObjects show note-count badges

Clicking badge filters Notes panel

Notes may target multiple WorkObjects

No duplication of note content

14. Grouping Model (Locked)

Groups are single-scope only

Group members must share the same meeting scope

Groups can be collapsed, labeled, and referenced

Groups are usable as synthesis units

Cross-meeting groups explicitly disallowed in V1

15. Synthesis Items (Locked)

Synthesis does not create new WorkObjects in V1.5.

Decision

Synthesis is derived, not stored:

Goal outcomes derived from goal state

Marker summaries derived from markers and groups

No synthesis_item WorkObject type

Rationale

Avoids polluting the semantic graph

Keeps synthesis lightweight

Explicit artifacts belong in Work Surfaces later

16. Agent Write Access (Locked)

Agent is read-only for WorkObjects

Agent may suggest:

notes

links

groups

Agent may not create WorkObjects without user confirmation

17. Performance & Scale Limits (Locked)
Hard Caps per Meeting

100 markers

200 notes

300 links

Behavior

Soft warning at 75%

Agent suggests moving to Work Surface

IndexedDB indexed by meeting_uid and work_object_id

18. External Data Ownership (Locked)

External data loss detected lazily

If dataRef unavailable:

mark WorkObject as stale

show:

⚠ Source unavailable


No auto-delete

19. Offline & Sync Story (Locked)

IndexedDB is authoritative

Single-device only

No sync or merge

Explicitly documented

20. Implementation Phases (Recommended)

WorkObject ID factory + meeting UID mapping

WorkObject store + tombstones + flags table

Object Action Menu + notes + linking + grouping

Apply to Prep / Capture / Synthesis

Agent reactivity

Work Surfaces

21. Why This Abstraction Holds

Decouples identity from external systems

Preserves referential integrity

Enables agent reasoning over structure

Avoids uncontrolled graph growth

Scales cleanly into Work Surfaces

This is the semantic backbone of the system.

End of Document
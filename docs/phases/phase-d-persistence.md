# Phase D — Persistence

## Summary
Implement IndexedDB storage for event log, meeting state, goals, and markers.

## Dependencies
- Phase A (UI Infrastructure)
- Phase B (Component Library) — for type definitions

## Deliverables

### 1. IndexedDB Schema

#### Stores
```typescript
// Object stores
interface DBSchema {
  events: EventRecord[];
  meetings: MeetingState[];
  intents: IntentItem[];
  markers: Marker[];
}
```

### 2. Event Log (§9.3)

```typescript
interface EventRecord {
  id: string;
  type: EventType;
  timestamp: number;
  payload: Record<string, unknown>;
}

type EventType =
  | 'plan_rendered'
  | 'mode_switched'
  | 'capsule_opened'
  | 'meeting_goal_updated'
  | 'my3_goal_added'
  | 'my3_goal_updated'
  | 'my3_goal_deleted'
  | 'goal_checked'
  | 'marker_created'
  | 'marker_labeled'
  | 'synthesis_completed'
  | 'intent_created'
  | 'intent_status_changed'
  | 'thumb_feedback';
```

### 3. Intent Ledger (§9.2)

```typescript
interface IntentItem {
  id: string;
  scope: 'meeting' | 'session';
  type: 'goal' | 'question' | 'data_need' | 'action' | 'note';
  text: string;
  status: 'open' | 'satisfied' | 'deferred';
  meetingId?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 4. Meeting State

```typescript
interface MeetingState {
  id: string;           // from calendar event
  title: string;
  startTime: number;
  endTime: number;
  attendees: string[];
  goal?: string;        // meeting goal
  my3Goals: My3Goal[];
  markers: Marker[];
  synthesisCompleted: boolean;
}

interface My3Goal {
  id: string;
  text: string;
  achieved: boolean;
  achievedAt?: number;
}

interface Marker {
  id: string;
  type: 'decision' | 'action' | 'risk' | 'question';
  label?: string;       // 3-5 words
  timestamp: number;
  meetingId: string;
}
```

### 5. Event Log Compaction (§9.4)

Implement compaction for noise events:

**Semantic events (keep forever):**
- Goals, markers, intent items, synthesis outcomes, mode switches, capsule opens

**Noise events (compact):**
- `plan_rendered`, minor UI telemetry

**Compaction rules:**
- Keep last 30 days OR last 10,000 noise events (whichever smaller)
- Summarize older noise into daily aggregates:
  - Counts of renders by mode
  - Override counts
  - Capsule open counts

### 6. Storage API

```typescript
interface StorageAPI {
  // Events
  logEvent(type: EventType, payload: Record<string, unknown>): Promise<void>;
  getEvents(filter?: EventFilter): Promise<EventRecord[]>;
  compactEvents(): Promise<void>;

  // Meetings
  getMeeting(id: string): Promise<MeetingState | null>;
  saveMeeting(meeting: MeetingState): Promise<void>;

  // Intents
  getIntents(scope?: 'meeting' | 'session'): Promise<IntentItem[]>;
  saveIntent(intent: IntentItem): Promise<void>;
  updateIntentStatus(id: string, status: IntentItem['status']): Promise<void>;
}
```

## Spec References
- §9 Intent Capture & Ledger
- §9.3 Event Log
- §9.4 Event Log Retention & Compaction

## Done Criteria
- [ ] IndexedDB initializes correctly
- [ ] Events can be logged and retrieved
- [ ] Meeting state persists across page refresh
- [ ] My3Goals persist and update correctly
- [ ] Markers persist with timestamps
- [ ] Compaction runs without data loss for semantic events
- [ ] Storage API is typed and testable

# Phase G — Calendar Integration

## Summary
Connect to Google Calendar (read-only) to provide real context for the rules engine.

## Dependencies
- Phase F (Rules Engine)

## Deliverables

### 1. Google OAuth Setup

```typescript
interface CalendarAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

async function initiateOAuth(): Promise<void>;
async function handleOAuthCallback(code: string): Promise<CalendarAuth>;
async function refreshAccessToken(auth: CalendarAuth): Promise<CalendarAuth>;
```

**Scopes required:**
- `https://www.googleapis.com/auth/calendar.readonly`

No Gmail scope in V1.

### 2. Calendar Snapshot

Fetch events for today + next 24 hours.

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  attendees: Attendee[];
  location?: string;
  description?: string;
}

interface Attendee {
  email: string;
  name?: string;
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

async function fetchCalendarSnapshot(
  auth: CalendarAuth
): Promise<CalendarEvent[]>;
```

### 3. Snapshot Caching

```typescript
interface SnapshotCache {
  events: CalendarEvent[];
  fetchedAt: number;
  staleAfterMs: number;  // e.g., 5 minutes
}

function isSnapshotStale(cache: SnapshotCache): boolean;
async function refreshSnapshotIfNeeded(): Promise<CalendarEvent[]>;
```

### 4. Context Integration

Connect calendar data to rules engine:

```typescript
async function getContextFromCalendar(): Promise<MeetingContext> {
  const events = await refreshSnapshotIfNeeded();
  return computeMeetingContext(events, Date.now(), timingConfig);
}
```

### 5. MeetingHeader Population

```typescript
function meetingToHeaderProps(event: CalendarEvent): MeetingHeaderProps {
  return {
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    attendees: event.attendees.map(a => a.name || a.email),
    location: event.location,
  };
}
```

### 6. App Open Flow

On app open:
1. Check OAuth status
2. If authenticated, fetch calendar snapshot
3. Compute meeting context
4. Select mode via rules engine
5. Render UI plan

```typescript
async function handleAppOpen(): Promise<UIPlan> {
  const auth = await getStoredAuth();
  if (!auth) {
    return renderOAuthPrompt();
  }

  const events = await fetchCalendarSnapshot(auth);
  const context = computeMeetingContext(events, Date.now(), config);
  const { plan } = await rulesEngine.evaluateContext(events, 'app_open');

  return plan;
}
```

### 7. Error Handling

```typescript
type CalendarError =
  | { type: 'auth_expired'; message: string }
  | { type: 'network_error'; message: string }
  | { type: 'rate_limited'; retryAfter: number }
  | { type: 'api_error'; code: number; message: string };

// On error: fall back to Neutral/Intent mode
// Show non-blocking error indicator
// Do NOT block UI rendering
```

### 8. Offline Behavior

If calendar unavailable:
- Use cached snapshot if available and not critically stale
- Fall back to Neutral/Intent if no cache
- Show subtle indicator: "Calendar unavailable"
- Do not block user from using app

## Spec References
- §11 Calendar Integration (V1)
- §4 Context Hierarchy

## Done Criteria
- [ ] OAuth flow completes successfully
- [ ] Calendar events fetch correctly
- [ ] Snapshot caches and refreshes appropriately
- [ ] Context engine uses real calendar data
- [ ] MeetingHeader displays real meeting info
- [ ] App open shows correct mode based on calendar
- [ ] Token refresh works when expired
- [ ] Graceful degradation when calendar unavailable
- [ ] No Gmail integration (out of scope)

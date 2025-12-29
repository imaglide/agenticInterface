# Parking Lot

Items deferred from V1 scope. Revisit post-launch or when relevant.

---

## WorkObjects (from design review)

### ~~Tombstone Accumulation~~ COMPLETED

Objects are never hard-deleted (tombstones only). Over time, power users may accumulate thousands of tombstoned markers/notes.

**Implemented:**
- `tombstone-compaction.ts` - 90-day retention, 5000 max count trigger, JSON export before purge
- `quota-monitor.ts` - Storage API monitoring with 75%/90% thresholds
- `use-storage-quota.ts` - React hook for quota info
- `deleteMy3Goal` migrated to soft-delete pattern with `restoreMy3Goal` helper

### ~~Linking Mode Timeout~~ COMPLETED

10s inactivity timeout may be too short if user is reading to decide what to link.

**Implemented:**
- `use-linking-mode.ts` - State machine with configurable timeout
- `requireExplicitCancel: true` by default (no auto-timeout)
- When timeout enabled: 30 seconds (increased from 10s)
- Timer resets on user interaction
- UI components: `LinkingModeOverlay`, `LinkableItem`, `WorkObjectActionMenu`
- Integrated into `CaptureMarkersPanel` and `My3GoalsCard`

### ~~Recurring Instance Rescheduling~~ COMPLETED

`start_time_iso` disambiguates recurring instances, but behavior when a recurring instance is rescheduled is undefined.

**Implemented:**
- `isSameDateDifferentTime()` detects same-day reschedules (e.g., 9am → 10am)
- Rescheduled instances retain their `meeting_uid` to preserve WorkObject graph
- `originalStartTimeIso` field added for audit trail
- 13 test cases covering same-day, different-day, and timezone edge cases

---

## Format

When adding items:

```
### Title
Brief description of the issue or deferral.

**Context:** Where this came from
**Consider later:** What to do about it
```

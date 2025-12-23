# Phase H — Founder Test

## Summary
Daily use of the system for one week to validate the core product thesis. Observe overrides, friction, and trust.

## Dependencies
- All previous phases (A–G)

## Protocol

### Duration
- Minimum: 5 business days
- Recommended: 7 consecutive days

### Daily Usage Requirements
- Open the app before every meeting
- Use prep mode for at least 3 meetings
- Use capture mode for at least 2 meetings
- Complete synthesis for at least 2 meetings

### Observation Framework

#### Trust Metrics
- [ ] Did you trust the first screen on open?
- [ ] How many times did you override the selected mode?
- [ ] Did you open "Why this view?" to understand decisions?
- [ ] Did you look for menus or navigation?

#### Flow Metrics
- [ ] Did prep feel quick (≤ 2 minutes)?
- [ ] Did capture preserve presence (not distracting)?
- [ ] Did synthesis provide closure?
- [ ] Were transitions calm or jarring?

#### Override Log
Record every manual mode switch:
```
Date       | From Mode  | To Mode   | Reason
-----------|------------|-----------|------------------
2024-01-15 | prep       | neutral   | Meeting cancelled
2024-01-15 | capture    | prep      | Wrong meeting detected
```

#### Friction Log
Record moments of frustration or confusion:
```
Date       | Mode       | Issue
-----------|------------|----------------------------------
2024-01-15 | prep       | Goal card too small on mobile
2024-01-16 | capture    | Hotkey conflict with system
```

### Daily Journal Prompts

End of each day, answer:
1. What worked well today?
2. What felt wrong or awkward?
3. Did the system choose correctly?
4. What did you wish it did differently?
5. Would you have preferred your old system today?

### Success Criteria (§16)

V1 succeeds if:
- [ ] You prefer opening this over your current system
- [ ] You trust the first screen
- [ ] You don't look for menus
- [ ] Prep, capture, and synthesis feel calm
- [ ] You feel "closed" after meetings

**If all five are true, the product is not fragile.**

### Failure Signals

Red flags that indicate thesis problems:
- Consistently overriding mode selection (>30% of opens)
- Avoiding the app before meetings
- Feeling anxious about what it will show
- Needing to "check" if it got it right
- Missing the control of a traditional UI

### Data Collection

From IndexedDB event log:
- Mode switch frequency
- Override frequency
- Capsule open frequency
- Time spent in each mode
- Goal completion rate
- Marker usage patterns

### Post-Test Analysis

After the week:
1. Review override log — patterns?
2. Review friction log — fixable vs fundamental?
3. Compare daily journal sentiment
4. Analyze event log data
5. Decide: iterate, pivot, or validate

### Output

Produce a brief report:
- Summary of findings (1 page)
- Key metrics table
- Top 3 things to fix
- Top 3 things that worked
- Go/no-go recommendation for external testing

## Spec References
- §16 Definition of Success (V1)
- §2 Core Product Principles
- §13 Meeting Hygiene & Agentic Hygiene

## Done Criteria
- [ ] Completed 5+ days of daily use
- [ ] Override log maintained
- [ ] Friction log maintained
- [ ] Daily journal completed
- [ ] Event log data exported
- [ ] Post-test report written
- [ ] Go/no-go decision made

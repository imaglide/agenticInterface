# Implementation Phases

V1 implementation is divided into 8 sequential phases. Each phase builds on previous work.

## Phase Overview

| Phase | Name | Dependencies | Summary |
|-------|------|--------------|---------|
| A | [UI Infrastructure](./phase-a-ui-infrastructure.md) | — | Next.js, schemas, renderer, layouts |
| B | [Component Library](./phase-b-component-library.md) | A | All V1 components |
| C | [Static UI Plans](./phase-c-static-ui-plans.md) | A, B | Hardcoded plans for each mode |
| D | [Persistence](./phase-d-persistence.md) | A, B | IndexedDB, event log, state |
| E | [Dev Harness](./phase-e-dev-harness.md) | A–D | Founder testing tool |
| F | [Rules Engine](./phase-f-rules-engine.md) | A, D, E | Context → mode selection |
| G | [Calendar Integration](./phase-g-calendar-integration.md) | F | Google Calendar OAuth |
| H | [Founder Test](./phase-h-founder-test.md) | A–G | 1 week daily use validation |

## Dependency Graph

```
A ─────┬──────────────────────────────────────┐
       │                                      │
       ▼                                      │
B ─────┬───────────────────────┐              │
       │                       │              │
       ▼                       ▼              │
C      D ──────────────────────┤              │
       │                       │              │
       ▼                       │              │
E ─────┴───────────────────────┤              │
                               │              │
                               ▼              │
                        F ─────┴──────────────┤
                               │              │
                               ▼              │
                        G ────────────────────┤
                               │              │
                               ▼              │
                        H ◄───────────────────┘
```

## Parallel Work Opportunities

- **A + nothing** — must complete first
- **B + D** — can overlap after A
- **C + E** — can overlap after B, D
- **F** — requires E for testing
- **G** — requires F
- **H** — requires everything

## Quick Reference

- **Main spec:** [agentic_interface_v1.md](../agentic_interface_v1.md)
- **Timing rules:** §4.1
- **Mode priority:** §4.2
- **Safe boundaries:** §4.3
- **Component list:** §8
- **Event types:** §9.3

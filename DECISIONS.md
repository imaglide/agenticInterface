# Design Decisions: Agentic Interface

This document records key design decisions, their rationale, and any changes over time.
For operational details (ports, commands, setup), see `CLAUDE.md`.

---

## Architecture Decisions

- **Intent Compiler Pattern (Jan 2026):** Use a compiler pattern (`Intent -> Schema -> Workspace`) instead of hardcoded layouts.
  *Rationale:* Decouples natural language understanding from UI rendering, allowing deterministic testing of the "compilation" variable.

- **Rules Engine for Mode Selection (Dec 2025):** Centralized `rules-engine` logic vs scattered `useEffect` checks.
  *Rationale:* Deterministic, testable logic for switching between Prep/Capture/Synthesis/Neutral modes based on context.

- **Storage: IndexedDB with Tombstones (Dec 2025):** Local-only storage with `deletedAt` soft deletes.
  *Rationale:* Ensures privacy (no cloud data) while enabling robust synchronization and undo capabilities via tombstoning.

- **Static UI Plans (Dec 2025):** UI layouts defined as JSON-schema-like objects (`src/plans/`).
  *Rationale:* Allows hot-swapping layouts and testing rendering logic independently of component implementation.

## Technology Choices

- **Next.js App Router (Dec 2025):** Using App Router over Pages Router.
  *Rationale:* Better layouts support, React Server Components (future proofing), and simplified routing.

- **Tailwind CSS (Dec 2025):** Utility-first CSS.
  *Rationale:* Rapid prototyping and consistent design token usage.

---

## References

- See `CLAUDE.md` for operational setup and commands
- See `rules.md` or `docs/rules.md` for workflow constraints

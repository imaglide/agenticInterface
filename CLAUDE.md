# Agentic Interface — Project Rules

## Dev Infrastructure

| Property | Value |
|----------|-------|
| Port | 3010 |
| Domain | http://agentic.test/ |
| Type | Next.js (App Router) |
| Command | `npm run dev` |

## Architecture

This is an **agent-driven UI** system. The agent chooses the UI surface based on calendar context; users supervise rather than navigate.

### Core Concepts

- **UI Plan**: JSON schema describing what to render (mode, layout, components, confidence)
- **Mode**: One of `neutral_intent`, `meeting_prep`, `meeting_capture`, `meeting_synthesis_min`
- **Component Registry**: Static mapping of component types to React components
- **Decision Capsule**: Explainability layer ("Why this view?")

### Key Files

| Path | Purpose |
|------|---------|
| `src/types/ui-plan.ts` | Core TypeScript types |
| `src/lib/component-registry.ts` | Component lookup |
| `src/components/layouts/` | Layout templates (Stack, Split, Single) |
| `src/components/PlanRenderer.tsx` | Main renderer |
| `docs/agentic_interface_v1.md` | Full specification |
| `docs/phases/` | Implementation phases |

### Rules

1. **Agent never generates UI code** — only selects from finite component library
2. **No component reordering after render** — stability rule
3. **Mode switches only at safe boundaries** — see spec §4.3
4. **Low confidence never auto-switches** — requires user intent

## Spec References

- Full spec: `docs/agentic_interface_v1.md`
- Current phase: Phase A (UI Infrastructure)

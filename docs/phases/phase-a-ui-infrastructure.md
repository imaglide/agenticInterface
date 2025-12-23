# Phase A — UI Infrastructure

## Summary
Set up the foundational rendering system: Next.js project, UI Plan schemas, component registry, and layout renderer.

## Dependencies
- None (first phase)

## Deliverables

### 1. Next.js + TypeScript Project
- Initialize Next.js with TypeScript
- Configure path aliases
- Set up basic project structure

### 2. UI Plan Schema
Define the core schema that all UI Plans must conform to.

```typescript
interface UIPlan {
  id: string;
  mode: Mode;
  layout: LayoutTemplate;
  components: ComponentInstance[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  timestamp: number;
}

type Mode =
  | 'neutral_intent'
  | 'meeting_prep'
  | 'meeting_capture'
  | 'meeting_synthesis_min';

type LayoutTemplate = 'stack' | 'split' | 'single';

interface ComponentInstance {
  type: string;        // from registry
  id: string;          // stable instance ID
  props: Record<string, unknown>;
  variant_id?: string; // optional tracking
}
```

### 3. Component Registry
Static mapping of component types to React components.

```typescript
const ComponentRegistry: Record<string, React.ComponentType<any>> = {
  // Populated in Phase B
};
```

Requirements per spec §6.1:
- Static mapping (no A/B at registry level)
- Variants via props, not registry entries
- Optional `variant_id` in props for tracking

### 4. Renderer
Takes a UIPlan and renders it deterministically.

```typescript
function PlanRenderer({ plan }: { plan: UIPlan }) {
  // 1. Validate plan against schema
  // 2. Select layout template
  // 3. Render components from registry
  // 4. Enforce stability rules
}
```

### 5. Layout Templates
Per spec §6.2:
- `stack` — single column (Neutral, Synthesis)
- `split` — context left / action right (Prep)
- `single` — minimal canvas (Capture)

## Spec References
- §6 UI Plan System
- §6.1 Deterministic UI Plans
- §6.2 Layout Templates
- §6.3 Stability Rules

## Done Criteria
- [ ] Next.js project runs locally
- [ ] UIPlan TypeScript types defined
- [ ] Empty component registry exists
- [ ] Renderer renders a mock plan with placeholder components
- [ ] All three layout templates render correctly

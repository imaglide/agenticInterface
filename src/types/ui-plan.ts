/**
 * UI Plan Types
 *
 * Core type definitions for the agentic UI system.
 * See docs/agentic_interface_v1.md for full specification.
 */

/**
 * The four V1 modes supported by the system.
 * Priority order: capture > prep > synthesis > neutral
 */
export type Mode =
  | 'neutral_intent'
  | 'meeting_prep'
  | 'meeting_capture'
  | 'meeting_synthesis_min';

/**
 * Confidence level for mode selection decisions.
 * - HIGH: Single strong trigger, no competing higher-priority trigger
 * - MEDIUM: Trigger exists but competing trigger one level below
 * - LOW: No strong triggers; requires user intent
 */
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Layout templates determine the overall page structure.
 * - stack: Single column (Neutral, Synthesis)
 * - split: Context left / action right (Prep)
 * - single: Minimal canvas (Capture)
 */
export type LayoutTemplate = 'stack' | 'split' | 'single';

/**
 * A single component instance within a UI Plan.
 */
export interface ComponentInstance {
  /** Component type from the registry */
  type: string;
  /** Stable instance ID for React keys and stability tracking */
  id: string;
  /** Props to pass to the component */
  props: Record<string, unknown>;
  /** Optional variant ID for tracking A/B variants at the plan level */
  variant_id?: string;
}

/**
 * The core UI Plan schema.
 * Describes everything needed to render a complete view.
 */
export interface UIPlan {
  /** Unique plan ID */
  id: string;
  /** The mode this plan represents */
  mode: Mode;
  /** Layout template to use */
  layout: LayoutTemplate;
  /** Ordered list of components to render */
  components: ComponentInstance[];
  /** Decision confidence level */
  confidence: Confidence;
  /** Human-readable reason for this plan selection */
  reason: string;
  /** Timestamp when plan was created */
  timestamp: number;
}

/**
 * Alternative mode considered but not selected.
 * Shown in the Decision Capsule.
 */
export interface Alternative {
  mode: Mode;
  reason: string;
}

/**
 * Action available in the Decision Capsule.
 */
export interface CapsuleAction {
  type: 'switch_view' | 'set_intent';
  label: string;
  target?: Mode;
}

/**
 * Decision Capsule — the explainability/trust layer.
 * Accessible via "Why this view?" UI element.
 */
export interface DecisionCapsule {
  /** Human-readable view label */
  viewLabel: string;
  /** Confidence level */
  confidence: Confidence;
  /** One-line reason for selection */
  reason: string;
  /** Signals that influenced the decision */
  signalsUsed: string[];
  /** Alternative modes considered (max 3) */
  alternativesConsidered: Alternative[];
  /** Conditions that would change the selection */
  wouldChangeIf: string[];
  /** Available actions */
  actions: CapsuleAction[];
}

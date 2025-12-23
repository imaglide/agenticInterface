/**
 * Rules Engine
 *
 * Main entry point for mode selection and decision-making.
 * Combines context engine, mode selection, stability checks,
 * and capsule generation.
 *
 * See spec §5 Agentic UI Architecture
 */

import { Mode, UIPlan, DecisionCapsule, LayoutTemplate } from '@/types/ui-plan';
import { storage } from '@/storage';
import {
  CalendarEvent,
  TimingConfig,
  DEFAULT_TIMING_CONFIG,
  SwitchTrigger,
  StabilityState,
  EvaluationResult,
  MODE_LABELS,
} from './types';
import { computeMeetingContext } from './context-engine';
import { selectMode } from './mode-selector';
import { canAutoSwitch, createStabilityState, afterSwitch } from './stability';
import { generateCapsule, getAdjacencySuggestion } from './capsule-generator';

/**
 * Layout mapping for each mode.
 */
const MODE_LAYOUTS: Record<Mode, LayoutTemplate> = {
  neutral_intent: 'stack',
  meeting_prep: 'split',
  meeting_capture: 'single',
  meeting_synthesis_min: 'stack',
};

/**
 * Generate a unique plan ID.
 */
function generatePlanId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Rules Engine class.
 *
 * Stateful engine that tracks stability and makes mode decisions.
 */
export class RulesEngine {
  private config: TimingConfig;
  private stabilityState: StabilityState | null = null;
  private timeOverride: number | null = null;

  constructor(config: TimingConfig = DEFAULT_TIMING_CONFIG) {
    this.config = config;
  }

  /**
   * Set a time override for testing.
   */
  setTimeOverride(time: number | null): void {
    this.timeOverride = time;
  }

  /**
   * Get current time (respects override).
   */
  private getNow(): number {
    return this.timeOverride ?? Date.now();
  }

  /**
   * Initialize stability state.
   */
  initialize(currentMode: Mode, planId: string): void {
    this.stabilityState = createStabilityState(
      currentMode,
      planId,
      this.config.minimumHoldMs
    );
  }

  /**
   * Update input focus state.
   */
  setInputFocused(isFocused: boolean): void {
    if (this.stabilityState) {
      this.stabilityState = {
        ...this.stabilityState,
        isInputFocused: isFocused,
      };
    }
  }

  /**
   * Evaluate context and determine if a mode switch should occur.
   *
   * This is the main entry point for the rules engine.
   */
  async evaluateContext(
    events: CalendarEvent[],
    trigger: SwitchTrigger
  ): Promise<EvaluationResult> {
    const now = this.getNow();

    // Compute meeting context
    const context = computeMeetingContext(events, now, this.config);

    // Select mode based on context
    const selection = selectMode(context, this.config);

    // Generate plan
    const planId = generatePlanId();
    const plan = this.createPlan(selection.mode, planId, selection.reason);

    // Generate decision capsule
    const capsule = generateCapsule(selection, context, this.config);

    // Check adjacency suggestion
    const adjacencySuggestion = getAdjacencySuggestion(selection.mode, context);

    // Check if switch is allowed
    let shouldSwitch = false;
    let blockedReason: string | undefined;

    if (this.stabilityState) {
      const switchCheck = canAutoSwitch(
        selection.mode,
        this.stabilityState,
        trigger
      );

      shouldSwitch = switchCheck.allowed;
      if (!switchCheck.allowed) {
        blockedReason = switchCheck.reason;
      }
    } else {
      // No stability state yet - allow switch
      shouldSwitch = true;
      this.stabilityState = createStabilityState(
        selection.mode,
        planId,
        this.config.minimumHoldMs
      );
    }

    // If switch is allowed, update stability state and log event
    if (shouldSwitch && this.stabilityState) {
      const previousMode = this.stabilityState.currentMode;
      this.stabilityState = afterSwitch(this.stabilityState, selection.mode, planId);

      // Log the mode switch event
      await storage.logEvent('mode_switched', {
        from: previousMode,
        to: selection.mode,
        trigger,
        reason: selection.reason,
        confidence: selection.confidence,
      });
    }

    // Log plan render
    await storage.logEvent('plan_rendered', {
      planId,
      mode: selection.mode,
      confidence: selection.confidence,
    });

    return {
      plan,
      capsule,
      shouldSwitch,
      blockedReason,
      adjacencySuggestion: adjacencySuggestion ?? undefined,
    };
  }

  /**
   * Force a mode switch (user-initiated).
   */
  async forceMode(
    mode: Mode,
    events: CalendarEvent[]
  ): Promise<EvaluationResult> {
    const now = this.getNow();
    const context = computeMeetingContext(events, now, this.config);

    const planId = generatePlanId();
    const plan = this.createPlan(mode, planId, 'User selected this mode');

    // Create capsule with user override noted
    const capsule: DecisionCapsule = {
      viewLabel: MODE_LABELS[mode],
      confidence: 'HIGH',
      reason: 'You selected this mode',
      signalsUsed: ['User selection'],
      alternativesConsidered: [],
      wouldChangeIf: ['You switch to another mode', 'A meeting boundary changes'],
      actions: [],
    };

    // Update stability state
    if (this.stabilityState) {
      this.stabilityState = afterSwitch(this.stabilityState, mode, planId);
    } else {
      this.stabilityState = createStabilityState(mode, planId, this.config.minimumHoldMs);
    }

    // Log the explicit switch
    await storage.logEvent('mode_switched', {
      from: this.stabilityState?.currentMode ?? 'unknown',
      to: mode,
      trigger: 'explicit_user_action',
      reason: 'User selected mode',
      confidence: 'HIGH',
    });

    return {
      plan,
      capsule,
      shouldSwitch: true,
      adjacencySuggestion: getAdjacencySuggestion(mode, context) ?? undefined,
    };
  }

  /**
   * Create a UI plan for a mode.
   *
   * Note: In this phase, we return minimal plan structure.
   * The actual component list comes from static plans (Phase C).
   */
  private createPlan(mode: Mode, planId: string, reason: string): UIPlan {
    return {
      id: planId,
      mode,
      layout: MODE_LAYOUTS[mode],
      components: [], // Components come from static plans
      confidence: 'HIGH',
      reason,
      timestamp: this.getNow(),
    };
  }

  /**
   * Get current stability state (for debugging).
   */
  getStabilityState(): StabilityState | null {
    return this.stabilityState;
  }

  /**
   * Get timing configuration.
   */
  getConfig(): TimingConfig {
    return this.config;
  }
}

/**
 * Singleton instance for the app.
 */
let engineInstance: RulesEngine | null = null;

/**
 * Get or create the rules engine singleton.
 */
export function getRulesEngine(config?: TimingConfig): RulesEngine {
  if (!engineInstance) {
    engineInstance = new RulesEngine(config);
  }
  return engineInstance;
}

/**
 * Reset the rules engine (for testing).
 */
export function resetRulesEngine(): void {
  engineInstance = null;
}

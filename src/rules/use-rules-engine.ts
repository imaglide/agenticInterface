/**
 * Rules Engine React Hook
 *
 * Provides easy access to the rules engine from React components.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mode, UIPlan, DecisionCapsule } from '@/types/ui-plan';
import {
  CalendarEvent,
  SwitchTrigger,
  AdjacencySuggestion,
  EvaluationResult,
} from './types';
import { getRulesEngine, RulesEngine } from './rules-engine';

interface UseRulesEngineOptions {
  initialMode?: Mode;
  events?: CalendarEvent[];
  onModeChange?: (mode: Mode, result: EvaluationResult) => void;
}

interface UseRulesEngineResult {
  currentMode: Mode;
  plan: UIPlan | null;
  capsule: DecisionCapsule | null;
  adjacencySuggestion: AdjacencySuggestion | undefined;
  isInputFocused: boolean;
  evaluate: (trigger: SwitchTrigger) => Promise<void>;
  forceMode: (mode: Mode) => Promise<void>;
  setInputFocused: (focused: boolean) => void;
  setTimeOverride: (time: number | null) => void;
}

/**
 * Hook for using the rules engine in React components.
 */
export function useRulesEngine(
  options: UseRulesEngineOptions = {}
): UseRulesEngineResult {
  const { initialMode = 'neutral_intent', events = [], onModeChange } = options;

  const engineRef = useRef<RulesEngine>(getRulesEngine());
  const [currentMode, setCurrentMode] = useState<Mode>(initialMode);
  const [plan, setPlan] = useState<UIPlan | null>(null);
  const [capsule, setCapsule] = useState<DecisionCapsule | null>(null);
  const [adjacencySuggestion, setAdjacencySuggestion] = useState<AdjacencySuggestion | undefined>();
  const [isInputFocused, setIsInputFocusedState] = useState(false);

  // Initialize engine on mount
  useEffect(() => {
    const engine = engineRef.current;
    engine.initialize(initialMode, `initial-${Date.now()}`);
  }, [initialMode]);

  // Evaluate context
  const evaluate = useCallback(
    async (trigger: SwitchTrigger) => {
      const engine = engineRef.current;
      const result = await engine.evaluateContext(events, trigger);

      if (result.shouldSwitch) {
        setCurrentMode(result.plan.mode);
        setPlan(result.plan);
        setCapsule(result.capsule);
        setAdjacencySuggestion(result.adjacencySuggestion);
        onModeChange?.(result.plan.mode, result);
      } else {
        // Update capsule even if not switching
        setCapsule(result.capsule);
        setAdjacencySuggestion(result.adjacencySuggestion);
      }
    },
    [events, onModeChange]
  );

  // Force mode change
  const forceMode = useCallback(
    async (mode: Mode) => {
      const engine = engineRef.current;
      const result = await engine.forceMode(mode, events);

      setCurrentMode(mode);
      setPlan(result.plan);
      setCapsule(result.capsule);
      setAdjacencySuggestion(result.adjacencySuggestion);
      onModeChange?.(mode, result);
    },
    [events, onModeChange]
  );

  // Set input focus state
  const setInputFocused = useCallback((focused: boolean) => {
    const engine = engineRef.current;
    engine.setInputFocused(focused);
    setIsInputFocusedState(focused);
  }, []);

  // Set time override
  const setTimeOverride = useCallback((time: number | null) => {
    const engine = engineRef.current;
    engine.setTimeOverride(time);
  }, []);

  return {
    currentMode,
    plan,
    capsule,
    adjacencySuggestion,
    isInputFocused,
    evaluate,
    forceMode,
    setInputFocused,
    setTimeOverride,
  };
}

/**
 * Hook for tracking input focus across the app.
 */
export function useFocusTracking(
  onFocusChange: (focused: boolean) => void
): {
  onFocus: () => void;
  onBlur: () => void;
} {
  const onFocus = useCallback(() => {
    onFocusChange(true);
  }, [onFocusChange]);

  const onBlur = useCallback(() => {
    onFocusChange(false);
  }, [onFocusChange]);

  return { onFocus, onBlur };
}

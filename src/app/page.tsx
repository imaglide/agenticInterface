'use client';

import { useState, useEffect } from 'react';
import { PlanRenderer } from '@/components/PlanRenderer';
import { DecisionCapsulePanel } from '@/components/shared/DecisionCapsulePanel';
import { DevHarness } from '@/components/dev/DevHarness';
import { ScenarioPanel } from '@/components/dev/ScenarioPanel';
import { Mode } from '@/types/ui-plan';
import { registerAllComponents } from '@/lib/register-components';
import { getRegisteredTypes } from '@/lib/component-registry';
import {
  staticPlans,
  staticCapsules,
  modeLabels,
  modeDescriptions,
} from '@/plans/static-plans';
import { storage, useEventLogger, useMeeting } from '@/storage';
import { useSessionTracking, INTERACTION_TYPES } from '@/hooks/use-session-tracking';
import { MeetingProvider } from '@/contexts/MeetingContext';
import { getScenarioById, activateScenario } from '@/test-harness';

// Register all components on module load
registerAllComponents();

const modeOrder: Mode[] = [
  'neutral_intent',
  'meeting_prep',
  'meeting_capture',
  'meeting_synthesis_min',
];

// Dev harness flag guard
function useDevMode() {
  const [isDev, setIsDev] = useState(false);
  const [noHarness, setNoHarness] = useState(false);
  const [scenarioId, setScenarioId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const devEnabled =
      process.env.NODE_ENV === 'development' || params.has('dev');
    // ?noharness=true hides the dev sidebar for sanity check day
    const noHarnessMode = params.has('noharness');
    // ?scenario=<id> loads a test scenario automatically
    const scenario = params.get('scenario');
    setIsDev(devEnabled);
    setNoHarness(noHarnessMode);
    setScenarioId(scenario);
  }, []);

  return { isDev, noHarness, scenarioId };
}

// Auto-load scenario from URL parameter
function useScenarioLoader(
  scenarioId: string | null,
  onMeetingChange: (id: string | null) => void,
  onModeChange: (mode: Mode) => void
) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!scenarioId || loaded) return;

    const scenario = getScenarioById(scenarioId);
    if (scenario) {
      activateScenario(scenario).then((result) => {
        if (result.success) {
          // Set the first meeting as active if there are meetings
          if (result.meetingIds.length > 0) {
            onMeetingChange(result.meetingIds[0]);
          }
          // Set the expected mode from the scenario
          if (scenario.expectedMode) {
            onModeChange(scenario.expectedMode);
          }
        }
        setLoaded(true);
        console.log(`[TestHarness] Loaded scenario: ${scenario.name}`, result);
      });
    } else {
      console.warn(`[TestHarness] Scenario not found: ${scenarioId}`);
      setLoaded(true);
    }
  }, [scenarioId, loaded, onMeetingChange, onModeChange]);

  return loaded;
}

export default function Home() {
  const [currentMode, setCurrentMode] = useState<Mode>('neutral_intent');
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [showPlanInspector, setShowPlanInspector] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);
  const { isDev, noHarness, scenarioId } = useDevMode();
  const { log } = useEventLogger();
  const { meeting, refresh: refreshMeeting } = useMeeting(currentMeetingId);

  // Auto-load scenario from URL ?scenario=<id>
  useScenarioLoader(scenarioId, setCurrentMeetingId, setCurrentMode);

  // Session tracking for bounce rate
  const { recordInteraction } = useSessionTracking(currentMode, currentMeetingId);

  const plan = staticPlans[currentMode];
  const capsule = staticCapsules[currentMode];

  useEffect(() => {
    setRegisteredCount(getRegisteredTypes().length);
  }, []);

  // Log plan renders
  useEffect(() => {
    log('plan_rendered', { mode: currentMode, planId: plan.id });
  }, [currentMode, plan.id, log]);

  // Handle mode changes with logging
  const handleModeChange = async (newMode: Mode) => {
    if (newMode !== currentMode) {
      // Record interaction to prevent bounce
      recordInteraction(INTERACTION_TYPES.MODE_SWITCH);
      await storage.logEvent('mode_switched', {
        from: currentMode,
        to: newMode,
        trigger: 'explicit_user_action',
        reason: 'User selected mode',
      });
      setCurrentMode(newMode);
    }
  };

  // Handle capsule actions
  const handleCapsuleAction = (action: { type: string; target?: Mode }) => {
    // Record interaction to prevent bounce
    recordInteraction(INTERACTION_TYPES.CAPSULE_OPEN);
    if (action.type === 'switch_view' && action.target) {
      handleModeChange(action.target);
    }
    // Log capsule interactions
    storage.logEvent('capsule_opened', { action: action.type, target: action.target });
  };

  return (
    <MeetingProvider meetingId={currentMeetingId} meeting={meeting} onMarkerAdded={refreshMeeting}>
      {/* Dev Navigation Panel */}
      <div className={`fixed left-4 top-4 z-50 w-64 rounded-xl bg-white shadow-xl ${isDev ? 'mr-80' : ''}`}>
        {/* Header */}
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-gray-900">Phase E Test</h2>
          <p className="text-xs text-gray-500">
            {registeredCount} components • {isDev ? 'Dev mode' : 'Static plans'}
          </p>
        </div>

        {/* Mode Selector */}
        <div className="p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Mode
          </p>
          <div className="flex flex-col gap-1">
            {modeOrder.map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`rounded-lg px-3 py-2 text-left transition ${
                  currentMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <p className="text-sm font-medium">{modeLabels[mode]}</p>
                <p className={`text-xs ${currentMode === mode ? 'text-blue-200' : 'text-gray-500'}`}>
                  {modeDescriptions[mode]}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Plan Inspector Toggle */}
        <div className="border-t p-3">
          <button
            onClick={() => setShowPlanInspector(!showPlanInspector)}
            className="flex w-full items-center justify-between rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
          >
            <span>Plan Inspector</span>
            <span className="text-gray-400">{showPlanInspector ? '▾' : '▸'}</span>
          </button>

          {showPlanInspector && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-gray-900 p-3 text-xs">
              <pre className="text-green-400">
                {JSON.stringify(
                  {
                    id: plan.id,
                    mode: plan.mode,
                    layout: plan.layout,
                    confidence: plan.confidence,
                    reason: plan.reason,
                    components: plan.components.map((c) => ({
                      type: c.type,
                      id: c.id,
                    })),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Quick Info */}
        <div className="border-t p-3 text-xs text-gray-500">
          <p><strong>Layout:</strong> {plan.layout}</p>
          <p><strong>Confidence:</strong> {plan.confidence}</p>
          <p><strong>Components:</strong> {plan.components.length}</p>
          {currentMeetingId && <p><strong>Meeting:</strong> {currentMeetingId.slice(0, 12)}...</p>}
        </div>

        {/* Founder Test Link */}
        {isDev && (
          <div className="border-t p-3">
            <a
              href="/founder-test"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
            >
              <span>📊</span>
              <span>Founder Test Dashboard</span>
            </a>
          </div>
        )}
      </div>

      {/* Plan Renderer */}
      <PlanRenderer plan={plan} />

      {/* Decision Capsule Panel ("Why this view?") */}
      <DecisionCapsulePanel
        capsule={capsule}
        onAction={handleCapsuleAction}
      />

      {/* Dev Harness (only in dev mode, hidden with ?noharness for sanity check) */}
      {isDev && !noHarness && (
        <>
          <DevHarness
            currentMode={currentMode}
            onModeChange={handleModeChange}
            currentMeetingId={currentMeetingId}
            onMeetingChange={setCurrentMeetingId}
          />
          <ScenarioPanel onScenarioLoaded={refreshMeeting} />
        </>
      )}
    </MeetingProvider>
  );
}

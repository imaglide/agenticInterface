/**
 * Test Harness Module
 *
 * Provides scenario-based testing for the agentic interface.
 * Load predefined scenarios to test different contexts and intents.
 */

// Types
export type {
  TestScenario,
  TimelineScenario,
  ScenarioMeeting,
  ScenarioIntent,
  ScenarioCalendarEvent,
  ScenarioLoadResult,
  ScenarioState,
  TimeControl,
  ScenarioCheckpoint,
} from './types';

// Scenarios
export {
  basicScenarios,
  complexScenarios,
  timelineScenarios,
  allScenarios,
  getScenarioById,
  getScenariosByTag,
  getAllTags,
} from './scenarios';

// Loader
export {
  loadScenario,
  activateScenario,
  deactivateScenario,
  clearScenarioData,
  getScenarioState,
  getVirtualNow,
  timeControl,
  jumpToCheckpoint,
  getSimulatedCalendarEvents,
  convertCalendarEvent,
} from './scenario-loader';

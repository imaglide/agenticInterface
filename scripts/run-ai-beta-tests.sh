#!/bin/bash
#
# AI Beta Tester Integration Script
#
# Runs AI-powered exploratory testing against the agentic interface
# using different personalities and scenarios.
#
# Prerequisites:
#   1. aiBetaTester project at /Users/rob/Development/aiBetaTester
#   2. Python 3.11+ with venv
#   3. Agentic interface running at http://agentic.test
#
# Usage:
#   ./scripts/run-ai-beta-tests.sh                    # Run default tests
#   ./scripts/run-ai-beta-tests.sh --scenario=busy-monday
#   ./scripts/run-ai-beta-tests.sh --all-scenarios
#

set -e

# Configuration
AI_BETA_TESTER_DIR="/Users/rob/Development/aiBetaTester"
APP_URL="http://agentic.test"
REPORTS_DIR="./ai-beta-reports"
DEFAULT_AGENTS="speedrunner,methodical_newcomer,chaos_gremlin,skeptical_exec_assistant"
MAX_ACTIONS=50
MAX_DURATION=600

# Scenarios available (from test-harness)
SCENARIOS=(
  # Basic scenarios
  "empty-slate"
  "upcoming-meeting-30min"
  "active-meeting"
  "post-meeting"
  # Complex scenarios
  "back-to-back"
  "busy-monday"
  "quiet-afternoon"
  # Timeline scenarios
  "meeting-lifecycle"
  "transition-stress"
  # Edge case scenarios
  "edge-exact-prep-boundary"
  "edge-just-outside-prep"
  "edge-meeting-just-started"
  "edge-max-goals"
  "edge-many-markers"
  "edge-overlapping-meetings"
  "edge-meeting-no-attendees"
  # Stress test scenarios
  "stress-unicode-titles"
  "stress-special-chars"
  "stress-very-long-text"
  "stress-many-meetings"
  "stress-concurrent-meetings"
  "stress-whitespace"
)

# Parse arguments
SCENARIO=""
ALL_SCENARIOS=false
AGENTS="$DEFAULT_AGENTS"
GOAL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --scenario=*)
      SCENARIO="${1#*=}"
      shift
      ;;
    --all-scenarios)
      ALL_SCENARIOS=true
      shift
      ;;
    --agents=*)
      AGENTS="${1#*=}"
      shift
      ;;
    --goal=*)
      GOAL="${1#*=}"
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --scenario=ID      Run against specific scenario"
      echo "  --all-scenarios    Run against all scenarios"
      echo "  --agents=LIST      Comma-separated agent list (default: $DEFAULT_AGENTS)"
      echo "  --goal=TEXT        Custom test goal"
      echo ""
      echo "Available scenarios:"
      for s in "${SCENARIOS[@]}"; do
        echo "  - $s"
      done
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check prerequisites
if [ ! -d "$AI_BETA_TESTER_DIR" ]; then
  echo "Error: AI Beta Tester not found at $AI_BETA_TESTER_DIR"
  exit 1
fi

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Activate AI Beta Tester environment
cd "$AI_BETA_TESTER_DIR"
if [ ! -d ".venv" ]; then
  echo "Creating Python virtual environment..."
  python3.11 -m venv .venv
  source .venv/bin/activate
  pip install -e .
else
  source .venv/bin/activate
fi

# Function to run a single test
run_test() {
  local scenario="$1"
  local goal="$2"
  local url="$APP_URL"

  if [ -n "$scenario" ]; then
    url="${APP_URL}?scenario=${scenario}&noharness"
    goal="${goal:-Explore the app in the '$scenario' scenario and identify any UX issues}"
  else
    goal="${goal:-Navigate through all four modes and understand what each does}"
  fi

  local timestamp=$(date +%Y%m%d_%H%M%S)
  local report_name="beta_test_${scenario:-default}_${timestamp}"

  echo ""
  echo "============================================"
  echo "Running AI Beta Test"
  echo "  URL: $url"
  echo "  Goal: $goal"
  echo "  Agents: $AGENTS"
  echo "============================================"
  echo ""

  ai-beta-test run "$url" \
    --goal "$goal" \
    --agents "$AGENTS" \
    --max-actions "$MAX_ACTIONS" \
    --max-duration "$MAX_DURATION" \
    --output "$REPORTS_DIR/$report_name"

  echo ""
  echo "Report saved to: $REPORTS_DIR/$report_name"
}

# Run tests
if [ "$ALL_SCENARIOS" = true ]; then
  echo "Running AI Beta Tests for all scenarios..."
  for scenario in "${SCENARIOS[@]}"; do
    run_test "$scenario" ""
  done
  echo ""
  echo "All tests complete! Reports in: $REPORTS_DIR"
elif [ -n "$SCENARIO" ]; then
  run_test "$SCENARIO" "$GOAL"
else
  # Default: run without scenario
  run_test "" "$GOAL"
fi

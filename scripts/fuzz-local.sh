#!/bin/bash
#
# Fuzz Testing Script
#
# Runs the robust automated fuzzing strategy by picking a random seed
# and invoking the existing test runner.
#

set -e

# Generate a random seed if not provided
SEED=${1:-$RANDOM}
COMPLEXITY=${2:-medium}

echo "========================================"
echo "🎲 Starting Fuzz Test"
echo "Seed: $SEED"
echo "Complexity: $COMPLEXITY"
echo "Scenario ID: fuzz-$SEED-$COMPLEXITY"
echo "========================================"

# Calculate a goal based on complexity
if [ "$COMPLEXITY" = "high" ]; then
  GOAL="Survive the chaos and report any crashes or layout breakages."
else
  GOAL="Explore the randomly generated scenario and verify data consistency."
fi

# Run the standard test script with the dynamic scenario ID
./scripts/run-ai-beta-tests.sh --scenario="fuzz-$SEED-$COMPLEXITY" --goal="$GOAL"

#!/bin/bash
#
# Matrix Fuzz Runner
#
# Orchestrates multiple runs of the fuzz testing strategy.
# Allows testing "Volume" (many runs) and "Variety" (different agents).
#

set -e

RUNS=${1:-5}
PARALLELISM=${2:-1} # Future: support parallel runs?

echo "========================================"
echo "🕹️  Starting Matrix Fuzz Test"
echo "Target Runs: $RUNS"
echo "========================================"

FAILED_SEEDS=""
SUCCESS_COUNT=0
FAIL_COUNT=0

for ((i=1; i<=RUNS; i++)); do
  SEED=$RANDOM
  # Alternate complexity
  if (( i % 3 == 0 )); then
    COMPLEXITY="high"
  elif (( i % 3 == 1 )); then
    COMPLEXITY="medium"
  else
    COMPLEXITY="low"
  fi
  
  SCENARIO_ID="fuzz-$SEED-$COMPLEXITY"
  
  echo ""
  echo "----------------------------------------"
  echo "Run $i/$RUNS: Scenario $SCENARIO_ID"
  echo "----------------------------------------"
  
  # Run the test
  # We use set +e here so a single failure doesn't stop the whole matrix
  set +e
  ./scripts/run-ai-beta-tests.sh --scenario="$SCENARIO_ID" --goal="Matrix Run $i: Validation"
  EXIT_CODE=$?
  set -e
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Run $i Passed"
    ((SUCCESS_COUNT++))
  else
    echo "❌ Run $i Failed (Seed: $SEED)"
    FAILED_SEEDS="$FAILED_SEEDS $SEED"
    ((FAIL_COUNT++))
  fi
  
  # Brief cooldown to let ports clear if needed
  sleep 2
done

echo ""
echo "========================================"
echo "📊 Matrix Complete"
echo "Total Runs: $RUNS"
echo "Passed: $SUCCESS_COUNT"
echo "Failed: $FAIL_COUNT"
if [ -n "$FAILED_SEEDS" ]; then
  echo "Failed Seeds: $FAILED_SEEDS"
fi
echo "========================================"

if [ $FAIL_COUNT -gt 0 ]; then
  exit 1
else
  exit 0
fi

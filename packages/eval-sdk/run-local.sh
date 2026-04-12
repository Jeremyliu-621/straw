#!/usr/bin/env bash
# Usage: ./run-local.sh <eval-image> <agent-output-dir>
# Example: ./run-local.sh myorg/my-eval:latest ./test-output
set -e
EVAL_IMAGE=${1:?"Usage: run-local.sh <eval-image> <agent-output-dir>"}
AGENT_OUTPUT_DIR=${2:?"Usage: run-local.sh <eval-image> <agent-output-dir>"}
RESULTS_DIR=$(mktemp -d)
echo "Running eval container: $EVAL_IMAGE"
echo "Agent output: $AGENT_OUTPUT_DIR"
echo "Results dir: $RESULTS_DIR"
docker run --rm \
  --network none \
  -v "$(realpath "$AGENT_OUTPUT_DIR"):/agent_output:ro" \
  -v "$RESULTS_DIR:/results" \
  --memory 1g \
  --cpus 2 \
  "$EVAL_IMAGE"
echo ""
echo "=== score.json ==="
cat "$RESULTS_DIR/score.json"

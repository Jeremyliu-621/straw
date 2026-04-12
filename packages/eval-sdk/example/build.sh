#!/usr/bin/env bash
# Build the example eval container image for local testing
set -e
cd "$(dirname "$0")"
docker build -t straw-eval-example:latest .
echo "Built: straw-eval-example:latest"

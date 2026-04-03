#!/bin/sh

# Crash agent: simulates a failing agent
echo "Starting processing..."
echo "ERROR: Unhandled exception in agent runtime" >&2
echo "Segmentation fault (core dumped)" >&2
exit 1

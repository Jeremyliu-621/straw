#!/bin/sh
set -e

# Okay agent: gets the job done, nothing fancy
INPUT="${MAP_TASK_INPUT:-}"

mkdir -p /output

cat > /output/result.json <<RESULT_EOF
{
  "status": "success",
  "output": "Input processed. Basic requirements met.",
  "input_received": $([ -n "$INPUT" ] && echo "true" || echo "false")
}
RESULT_EOF

echo "Okay agent done"

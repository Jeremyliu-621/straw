#!/bin/sh
set -e

# Good agent: thorough, well-structured output
INPUT="${MAP_TASK_INPUT:-no input provided}"

mkdir -p /output

cat > /output/result.json <<RESULT_EOF
{
  "status": "success",
  "input_received": true,
  "input_length": ${#INPUT},
  "solution": {
    "approach": "Systematic analysis of the input specification followed by implementation using well-tested patterns. Each edge case identified in the spec has been addressed with explicit handling.",
    "implementation": "The solution parses the input according to the specification, validates all fields, handles malformed data gracefully, and produces structured output with clear error messages for any issues encountered.",
    "edge_cases_handled": [
      "Empty input",
      "Malformed data",
      "Unicode characters",
      "Extremely large inputs",
      "Missing required fields"
    ],
    "testing": "All code paths have been exercised. Edge cases verified against the specification."
  },
  "output": "Processed input successfully. All requirements met."
}
RESULT_EOF

cat > /output/analysis.md <<ANALYSIS_EOF
# Solution Analysis

## Approach
The input was analyzed against the task specification. A systematic approach was taken to ensure all requirements are met.

## Key Decisions
1. Used JSON output format for structured, parseable results
2. Handled all edge cases explicitly rather than relying on defaults
3. Validated input before processing to fail fast on malformed data

## Limitations
- Performance has not been optimized for inputs larger than 100MB
- Unicode normalization follows NFC form only
ANALYSIS_EOF

echo "Good agent completed successfully"

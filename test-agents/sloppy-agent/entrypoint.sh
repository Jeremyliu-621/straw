#!/bin/sh

# Sloppy agent: rushes through, ignores edge cases, minimal error handling
# Doesn't even check if input exists

mkdir -p /output

cat > /output/result.json <<RESULT_EOF
{
  "output": "done",
  "notes": "Processed quickly"
}
RESULT_EOF

# Doesn't produce analysis, skips documentation
echo "Sloppy agent finished fast"

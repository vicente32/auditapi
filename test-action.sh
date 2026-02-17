#!/bin/bash
# Test script for GitHub Action

echo "Testing GitHub Action..."

# Run the action and capture outputs
docker run --rm \
  -v "C:\Users\labme\OneDrive\Escritorio\AuditAPI\tests:/tests" \
  -e INPUT_FILE=/tests/casing-mixed.yaml \
  -e INPUT_FAIL_ON=C \
  -e INPUT_VERBOSE=false \
  -e INPUT_CONFIG=./config \
  -e GITHUB_OUTPUT=/tmp/github_output \
  auditapi:latest

# Check exit code
EXIT_CODE=$?
echo ""
echo "Exit code: $EXIT_CODE"

# Read the outputs
echo ""
echo "GitHub Outputs:"
docker run --rm \
  -v "C:\Users\labme\OneDrive\Escritorio\AuditAPI\tests:/tests" \
  auditapi:latest cat /tmp/github_output 2>/dev/null || echo "Could not read outputs"

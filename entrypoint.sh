#!/bin/sh
# GitHub Action Entrypoint Script
# This script bridges GitHub Actions inputs/outputs with the AuditAPI CLI

set -e

# Debug mode
if [ "${RUNNER_DEBUG}" = "1" ]; then
  set -x
  echo "Debug mode enabled"
fi

# Get inputs from environment variables
FILE="${INPUT_FILE:-openapi.yaml}"
FAIL_ON="${INPUT_FAIL_ON:-D}"
VERBOSE="${INPUT_VERBOSE:-false}"
CONFIG="${INPUT_CONFIG:-./config}"
OUTPUT="${INPUT_OUTPUT:-}"

echo "🔍 AuditAPI - OpenAPI Quality Audit"
echo "===================================="
echo ""
echo "📄 File: ${FILE}"
echo "🎯 Fail on: ${FAIL_ON}"
echo "📊 Verbose: ${VERBOSE}"
echo "⚙️  Config: ${CONFIG}"
echo ""

# Build the command
CMD="audit"
ARGS="${FILE} --fail-on ${FAIL_ON} --config ${CONFIG}"

if [ "${VERBOSE}" = "true" ]; then
  ARGS="${ARGS} --verbose"
fi

# Run the audit
echo "Running audit..."
echo ""

# Create temp file for JSON output
TEMP_OUTPUT=$(mktemp)

# Run audit and capture both stdout and the result
if node dist/cli/index.js ${CMD} ${ARGS} --json > "${TEMP_OUTPUT}" 2>&1; then
  EXIT_CODE=0
  echo "✅ Audit completed successfully"
else
  EXIT_CODE=$?
  echo "❌ Audit failed with exit code ${EXIT_CODE}"
fi

# Parse the JSON output and set GitHub Action outputs
if [ -f "${TEMP_OUTPUT}" ] && [ -s "${TEMP_OUTPUT}" ]; then
  # Check if output is valid JSON
  if jq empty "${TEMP_OUTPUT}" 2>/dev/null; then
    SCORE=$(jq -r '.finalScore // 0' "${TEMP_OUTPUT}")
    GRADE=$(jq -r '.grade // "F"' "${TEMP_OUTPUT}")
    PASSED=$(jq -r '.passed // false' "${TEMP_OUTPUT}")
    VIOLATIONS=$(jq -r '.summary.totalViolations // 0' "${TEMP_OUTPUT}")
    ERRORS=$(jq -r '.summary.errorCount // 0' "${TEMP_OUTPUT}")
    WARNINGS=$(jq -r '.summary.warningCount // 0' "${TEMP_OUTPUT}")
    
    # Set outputs for GitHub Actions
    echo "score=${SCORE}" >> $GITHUB_OUTPUT
    echo "grade=${GRADE}" >> $GITHUB_OUTPUT
    echo "passed=${PASSED}" >> $GITHUB_OUTPUT
    echo "violations=${VIOLATIONS}" >> $GITHUB_OUTPUT
    echo "errors=${ERRORS}" >> $GITHUB_OUTPUT
    echo "warnings=${WARNINGS}" >> $GITHUB_OUTPUT
    
    # Output the full report (escaped for multiline)
    echo "report<<EOF" >> $GITHUB_OUTPUT
    cat "${TEMP_OUTPUT}" >> $GITHUB_OUTPUT
    echo "EOF" >> $GITHUB_OUTPUT
    
    # Also display summary
    echo ""
    echo "📊 Audit Summary"
    echo "================"
    echo "Score: ${SCORE}/100"
    echo "Grade: ${GRADE}"
    echo "Passed: ${PASSED}"
    echo "Violations: ${VIOLATIONS} (Errors: ${ERRORS}, Warnings: ${WARNINGS})"
    echo ""
    
    # Show violations in human-readable format if not verbose
    if [ "${VERBOSE}" != "true" ] && [ "${ERRORS}" -gt 0 ]; then
      echo "❌ Errors found:"
      jq -r '.violations[] | select(.severity == "error") | "  - [\(.ruleId)] \(.message)"' "${TEMP_OUTPUT}"
      echo ""
    fi
    
  else
    echo "⚠️  Warning: Could not parse audit output as JSON"
    cat "${TEMP_OUTPUT}"
  fi
  
  # If output file specified, copy the report
  if [ -n "${OUTPUT}" ]; then
    cp "${TEMP_OUTPUT}" "${OUTPUT}"
    echo "📄 Report saved to: ${OUTPUT}"
  fi
fi

# Cleanup
rm -f "${TEMP_OUTPUT}"

# Exit with the audit's exit code
exit ${EXIT_CODE}

/**
 * Consistent Casing Rule for AuditAPI
 * Detects mixed camelCase and snake_case in JSON schema properties
 * 
 * Logic:
 * 1. Recursively traverse all keys in components/schemas and response bodies
 * 2. Count camelCase and snake_case keys
 * 3. Fail if >5 total keys AND minority ratio >20%
 */

// Regex patterns for casing detection
const CAMEL_CASE_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const SNAKE_CASE_PATTERN = /^[a-z][a-z0-9]*(_[a-z][a-z0-9]*)*$/;
const IGNORED_KEYS = ['type', 'format', 'properties', 'items', 'required', 'description', 'example', 'examples'];

/**
 * Checks if a key is camelCase
 */
function isCamelCase(key) {
  return CAMEL_CASE_PATTERN.test(key) && !key.includes('_');
}

/**
 * Checks if a key is snake_case
 */
function isSnakeCase(key) {
  return SNAKE_CASE_PATTERN.test(key) && key.includes('_');
}

/**
 * Recursively counts casing styles in an object
 */
function countCasingStyles(obj, stats = { camelCase: 0, snakeCase: 0, total: 0 }) {
  if (typeof obj !== 'object' || obj === null) {
    return stats;
  }

  for (const key of Object.keys(obj)) {
    // Skip OpenAPI schema keywords
    if (IGNORED_KEYS.includes(key)) {
      // Still recurse into properties
      if (key === 'properties' && typeof obj[key] === 'object') {
        countCasingStyles(obj[key], stats);
      }
      if (key === 'items' && typeof obj[key] === 'object') {
        countCasingStyles(obj[key], stats);
      }
      continue;
    }

    stats.total++;

    if (isCamelCase(key)) {
      stats.camelCase++;
    } else if (isSnakeCase(key)) {
      stats.snakeCase++;
    }

    // Recurse into nested objects
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      countCasingStyles(obj[key], stats);
    }
  }

  return stats;
}

/**
 * Spectral custom function for consistent casing validation
 * 
 * @param {object} targetVal - The value being validated
 * @param {object} options - Function options
 * @param {object} context - Validation context
 * @returns {Array} - Array of validation messages
 */
function consistentCasing(targetVal, options, context) {
  const stats = countCasingStyles(targetVal);
  
  // Debug logging (remove in production)
  // console.log('Casing stats:', stats);

  // Must have more than 5 keys total to trigger the check
  if (stats.total <= 5) {
    return [];
  }

  // Calculate minority ratio
  const majority = Math.max(stats.camelCase, stats.snakeCase);
  const minority = Math.min(stats.camelCase, stats.snakeCase);
  
  // If no minority (only one style), no error
  if (minority === 0) {
    return [];
  }

  const ratio = minority / (majority + minority);

  // If ratio > 20%, report error
  if (ratio > 0.20) {
    const majorityStyle = stats.camelCase > stats.snakeCase ? 'camelCase' : 'snake_case';
    const minorityStyle = stats.camelCase > stats.snakeCase ? 'snake_case' : 'camelCase';
    
    return [
      {
        message: `Inconsistent Property Casing detected. Found ${stats.camelCase} camelCase and ${stats.snakeCase} snake_case keys. Majority style is ${majorityStyle} but ${minorityStyle} represents ${(ratio * 100).toFixed(1)}% of keys.`,
      }
    ];
  }

  return [];
}

// Export for Spectral
module.exports = consistentCasing;

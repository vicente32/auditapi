/**
 * Type definitions for AuditAPI configuration files
 * Strict typing for scoring.yaml and ruleset.yaml structures
 */

// ============================================================================
// Scoring Configuration Types
// ============================================================================

/**
 * Represents a single penalty rule
 */
export interface PenaltyRule {
  /** Points to deduct for violating this rule */
  points: number;
  /** Whether this violation causes automatic F grade */
  fatal: boolean;
}

/**
 * Category weights for scoring calculation
 */
export interface CategoryWeights {
  /** Security rules weight (default: 0.35) */
  security: number;
  /** Completeness rules weight (default: 0.25) */
  completeness: number;
  /** Structure rules weight (default: 0.25) */
  structure: number;
  /** Consistency rules weight (default: 0.15) */
  consistency: number;
  /** Architecture rules weight (component referencing) */
  architecture: number;
}

/**
 * Grade threshold definition
 */
export interface GradeThreshold {
  /** Minimum score (inclusive) */
  min: number;
  /** Maximum score (inclusive) */
  max: number;
}

/**
 * Complete grading scale
 */
export interface GradingScale {
  A: GradeThreshold;
  B: GradeThreshold;
  C: GradeThreshold;
  D: GradeThreshold;
  F: GradeThreshold;
}

/**
 * Complete scoring configuration structure
 */
export interface ScoringConfig {
  /** Base score (default: 100) */
  base_score: number;
  /** Category weights for weighted scoring */
  weights: CategoryWeights;
  /** Map of rule IDs to their penalty definitions */
  penalties: Record<string, PenaltyRule>;
  /** Grade thresholds */
  grading_scale: GradingScale;
}

// ============================================================================
// Spectral Ruleset Types
// ============================================================================

/**
 * Spectral severity levels
 */
export type SpectralSeverity = "error" | "warn" | "info" | "hint";

/**
 * Spectral rule function options
 */
export interface SpectralFunctionOptions {
  [key: string]: unknown;
}

/**
 * Spectral rule definition structure
 */
export interface SpectralRule {
  /** Human-readable description of the rule */
  description: string;
  /** Error message template */
  message?: string;
  /** JSONPath expression(s) to target */
  given: string | string[];
  /** Rule condition(s) */
  then: SpectralRuleThen | SpectralRuleThen[];
  /** Severity level */
  severity: SpectralSeverity;
  /** Tags for categorization */
  tags?: string[];
  /** Whether rule is enabled (default: true) */
  enabled?: boolean;
  /** Rule documentation URL */
  documentationUrl?: string;
}

/**
 * Spectral rule then clause
 */
export interface SpectralRuleThen {
  /** Function name to execute */
  function: string;
  /** Function arguments/options */
  functionOptions?: SpectralFunctionOptions;
  /** Field to check (if applicable) */
  field?: string;
}

/**
 * Spectral ruleset extends declaration
 */
export interface SpectralRulesetExtends {
  /** Base rulesets to extend */
  extends: string[];
  /** Custom rule definitions */
  rules: Record<string, SpectralRule>;
}

/**
 * Complete Spectral ruleset structure
 */
export interface SpectralRuleset {
  /** Base rulesets to extend (e.g., spectral:oas) - optional, handled by auditor */
  extends?: string[];
  /** Rule definitions keyed by rule ID */
  rules: Record<string, SpectralRule>;
}

// ============================================================================
// AuditAPI Result Types
// ============================================================================

/**
 * Individual violation found during audit
 */
export interface Violation {
  /** Rule ID that was violated */
  ruleId: string;
  /** Rule severity */
  severity: SpectralSeverity;
  /** Violation message */
  message: string;
  /** JSONPath to the violation location */
  path: string;
  /** Line number (if available) */
  line?: number;
  /** Column number (if available) */
  column?: number;
}

/**
 * Scoring breakdown by category
 */
export interface CategoryScore {
  /** Category name */
  category: string;
  /** Weight applied */
  weight: number;
  /** Raw points deducted */
  pointsDeducted: number;
  /** Violations in this category */
  violations: Violation[];
}

/**
 * Complete audit result
 */
export interface AuditResult {
  /** File path that was audited */
  filePath: string;
  /** Final score (0-100) */
  finalScore: number;
  /** Letter grade (A, B, C, D, F) */
  grade: string;
  /** Whether the audit passed (grade >= C) */
  passed: boolean;
  /** Whether any fatal violations were found */
  hasFatalErrors: boolean;
  /** All violations found */
  violations: Violation[];
  /** Score breakdown by category */
  categoryBreakdown: CategoryScore[];
  /** Summary statistics */
  summary: {
    totalViolations: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    fatalCount: number;
  };
  /** Audit timestamp */
  timestamp: string;
  /** Audit duration in milliseconds */
  duration: number;
  /** Additional notes or warnings */
  notes?: string[];
}

// ============================================================================
// Config Loader Types
// ============================================================================

/**
 * Configuration loading error
 */
export class ConfigLoadError extends Error {
  constructor(
    message: string,
    public readonly configPath: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

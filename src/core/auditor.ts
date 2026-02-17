/**
 * Auditor Core - Main auditing engine
 * Executes Spectral validation and calculates scores based on configuration
 */

import { Spectral, Document } from '@stoplight/spectral-core';
import * as Parsers from '@stoplight/spectral-parsers';
import { oas } from '@stoplight/spectral-rulesets';
import * as fs from 'fs';
import * as path from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';
import {
  ScoringConfig,
  SpectralRuleset,
  AuditResult,
  Violation,
  CategoryScore
} from '../types/config';
import { ConfigLoader } from '../config/loader';



/**
 * Determines category from rule tags or ID prefix
 */
function getRuleCategory(ruleId: string, tags?: string[]): string {
  if (tags) {
    if (tags.includes('security')) return 'security';
    if (tags.includes('completeness')) return 'completeness';
    if (tags.includes('structure')) return 'structure';
    if (tags.includes('consistency')) return 'consistency';
  }
  
  // Infer from rule ID prefix
  if (ruleId.startsWith('sec-')) return 'security';
  if (ruleId.startsWith('com-')) return 'completeness';
  if (ruleId.startsWith('str-')) return 'structure';
  if (ruleId.startsWith('cns-')) return 'consistency';
  
  return 'completeness'; // default
}

/**
 * Converts Spectral results to internal Violation format
 */
function convertResults(spectralResults: any[]): Violation[] {
  return spectralResults.map(result => ({
    ruleId: result.code,
    severity: result.severity === 0 ? 'error' : 
              result.severity === 1 ? 'warn' :
              result.severity === 2 ? 'info' : 'hint',
    message: result.message,
    path: result.path.join('.'),
    line: result.range?.start?.line,
    column: result.range?.start?.character
  }));
}

/**
 * Calculates score breakdown by category
 */
function calculateCategoryScores(
  violations: Violation[],
  scoringConfig: ScoringConfig,
  ruleset: SpectralRuleset
): CategoryScore[] {
  const categories = ['security', 'completeness', 'structure', 'consistency'] as const;
  
  return categories.map(category => {
    const categoryViolations = violations.filter(v => 
      getRuleCategory(v.ruleId, ruleset.rules[v.ruleId]?.tags) === category
    );
    
    let pointsDeducted = 0;
    for (const violation of categoryViolations) {
      const penalty = scoringConfig.penalties[violation.ruleId];
      if (penalty) {
        pointsDeducted += penalty.points;
      } else {
        // Default penalty based on severity
        pointsDeducted += violation.severity === 'error' ? 10 :
                          violation.severity === 'warn' ? 5 : 2;
      }
    }
    
    return {
      category,
      weight: scoringConfig.weights[category],
      pointsDeducted,
      violations: categoryViolations
    };
  });
}

/**
 * Calculates final grade based on score
 */
function calculateGrade(score: number, scale: ScoringConfig['grading_scale']): string {
  if (score >= scale.A.min) return 'A';
  if (score >= scale.B.min) return 'B';
  if (score >= scale.C.min) return 'C';
  if (score >= scale.D.min) return 'D';
  return 'F';
}

/**
 * Builds complete ruleset by merging OAS base with custom rules
 */
function buildRuleset(customRuleset: SpectralRuleset) {
  // Use OAS ruleset as base (includes aliases) and add custom rules
  return {
    ...oas,
    rules: {
      ...oas.rules,
      ...customRuleset.rules
    }
  };
}

/**
 * Main Auditor class
 */
export class Auditor {
  private scoringConfig: ScoringConfig;
  private rulesetConfig: SpectralRuleset;
  private spectral: Spectral;

  constructor(configLoader: ConfigLoader) {
    const configs = configLoader.loadAll();
    this.scoringConfig = configs.scoring;
    this.rulesetConfig = configs.ruleset;
    this.spectral = new Spectral();
    
    // Set up Spectral with merged ruleset
    const completeRuleset = buildRuleset(this.rulesetConfig);
    this.spectral.setRuleset(completeRuleset as any);
  }

  /**
   * Attempts to resolve OpenAPI document with all $ref references
   * Returns null if validation fails, allowing Spectral to run anyway
   */
  private async resolveDocument(filePath: string): Promise<unknown | null> {
    try {
      const parser = new SwaggerParser();
      // Try to dereference without strict validation
      const api = await parser.dereference(filePath);
      return api;
    } catch (error) {
      // Return null to indicate we couldn't resolve, but we'll continue with Spectral
      return null;
    }
  }

  /**
   * Runs Spectral linting on the document
   */
  private async runSpectral(document: Document): Promise<any[]> {
    // Run lint
    const results = await this.spectral.run(document);
    return results;
  }

  /**
   * Calculates final score and detects fatal errors
   */
  private calculateScore(
    violations: Violation[],
    categoryScores: CategoryScore[]
  ): { finalScore: number; hasFatalErrors: boolean } {
    // Check for fatal violations
    const hasFatalErrors = violations.some(v => {
      const penalty = this.scoringConfig.penalties[v.ruleId];
      return penalty?.fatal === true;
    });

    if (hasFatalErrors) {
      return { finalScore: 0, hasFatalErrors: true };
    }

    // Calculate weighted score
    let totalPenalty = 0;
    for (const category of categoryScores) {
      // Apply category weight to penalties
      const weightedPenalty = category.pointsDeducted * category.weight;
      totalPenalty += weightedPenalty;
    }

    const finalScore = Math.max(0, this.scoringConfig.base_score - totalPenalty);
    return { finalScore, hasFatalErrors: false };
  }

  /**
   * Main audit method
   */
  async audit(filePath: string): Promise<AuditResult> {
    const startTime = Date.now();
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Resolve document (handles $ref) - may fail but we continue with Spectral
      const resolvedDoc = await this.resolveDocument(filePath);
      const hasResolutionErrors = resolvedDoc === null;
      
      // Create Spectral document
      const content = fs.readFileSync(filePath, 'utf-8');
      const document = new Document(content, Parsers.Yaml as any, filePath);

      // Run Spectral validation
      const spectralResults = await this.runSpectral(document);
      
      // Convert to internal format
      const violations = convertResults(spectralResults);
      
      // Calculate category scores
      const categoryBreakdown = calculateCategoryScores(
        violations,
        this.scoringConfig,
        this.rulesetConfig
      );

      // Calculate final score
      const { finalScore, hasFatalErrors } = this.calculateScore(
        violations,
        categoryBreakdown
      );

      // Determine grade
      const grade = calculateGrade(finalScore, this.scoringConfig.grading_scale);

      // Count by severity
      const errorCount = violations.filter(v => v.severity === 'error').length;
      const warningCount = violations.filter(v => v.severity === 'warn').length;
      const infoCount = violations.filter(v => v.severity === 'info').length;
      const fatalCount = violations.filter(v => {
        const penalty = this.scoringConfig.penalties[v.ruleId];
        return penalty?.fatal === true;
      }).length;

      const duration = Date.now() - startTime;

      const result: AuditResult = {
        filePath: path.resolve(filePath),
        finalScore: Math.round(finalScore),
        grade,
        passed: grade !== 'F' && !hasFatalErrors,
        hasFatalErrors,
        violations,
        categoryBreakdown,
        summary: {
          totalViolations: violations.length,
          errorCount,
          warningCount,
          infoCount,
          fatalCount
        },
        timestamp: new Date().toISOString(),
        duration
      };

      // Add notes if there were resolution errors
      if (hasResolutionErrors) {
        result.notes = ["Warning: OpenAPI validation failed. File may contain structural errors that prevent full dereferencing. Audit results may be incomplete."];
      }

      return result;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Audit failed for ${filePath}: ${message}`);
    }
  }
}

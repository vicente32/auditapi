/**
 * ConfigLoader - Loads and validates YAML configuration files
 * Implements SOLID principles with single responsibility for configuration loading
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as spectralFunctions from '@stoplight/spectral-functions';
const consistentCasing = require('../functions/consistent-casing');
import {
  ScoringConfig,
  SpectralRuleset,
  ConfigLoadError,
  ValidationResult
} from '../types/config';

declare const __dirname: string;

const DEFAULT_CONFIG_DIR = path.resolve(__dirname, '../config');

// Map of Spectral function names to actual functions
const SPECTRAL_FUNCTION_MAP: Record<string, any> = {
  truthy: spectralFunctions.truthy,
  falsy: spectralFunctions.falsy,
  defined: spectralFunctions.defined,
  undefined: spectralFunctions.undefined,
  pattern: spectralFunctions.pattern,
  schema: spectralFunctions.schema,
  enumeration: spectralFunctions.enumeration,
  length: spectralFunctions.length,
  alphabetical: spectralFunctions.alphabetical,
  casing: spectralFunctions.casing,
  xor: spectralFunctions.xor,
  unreferencedReusableObject: spectralFunctions.unreferencedReusableObject,
  'unreferenced-reusable-object': spectralFunctions.unreferencedReusableObject,
  // Custom functions
  consistentCasing: consistentCasing,
  'consistent-casing': consistentCasing
};

/**
 * Resolves function names to actual Spectral functions
 */
function resolveRuleFunctions(ruleset: SpectralRuleset): SpectralRuleset {
  const resolvedRules: Record<string, any> = {};
  
  for (const [ruleId, rule] of Object.entries(ruleset.rules)) {
    resolvedRules[ruleId] = { ...rule };
    
    // Handle 'then' which can be a single object or array
    if (rule.then) {
      const thenArray = Array.isArray(rule.then) ? rule.then : [rule.then];
      const resolvedThen = thenArray.map(thenClause => {
        if (typeof thenClause.function === 'string') {
          const func = SPECTRAL_FUNCTION_MAP[thenClause.function];
          if (!func) {
            throw new ConfigLoadError(
              `Unknown Spectral function: ${thenClause.function} in rule ${ruleId}`,
              'ruleset.yaml'
            );
          }
          return {
            ...thenClause,
            function: func
          };
        }
        return thenClause;
      });
      
      resolvedRules[ruleId].then = Array.isArray(rule.then) ? resolvedThen : resolvedThen[0];
    }
  }
  
  return {
    ...ruleset,
    rules: resolvedRules
  };
}

/**
 * Validates that weights sum to 1.0
 */
function validateWeights(weights: ScoringConfig['weights']): string[] {
  const errors: string[] = [];
  const sum = Object.values(weights).reduce((acc, val) => acc + val, 0);
  
  if (Math.abs(sum - 1.0) > 0.001) {
    errors.push(`Category weights must sum to 1.0, got ${sum}`);
  }
  
  const requiredCategories = ['security', 'completeness', 'structure', 'consistency', 'architecture'];
  for (const category of requiredCategories) {
    if (!(category in weights)) {
      errors.push(`Missing required weight category: ${category}`);
    }
  }
  
  return errors;
}

/**
 * Validates grading scale for overlapping ranges
 */
function validateGradingScale(scale: ScoringConfig['grading_scale']): string[] {
  const errors: string[] = [];
  const grades = ['A', 'B', 'C', 'D', 'F'] as const;
  
  for (const grade of grades) {
    if (!(grade in scale)) {
      errors.push(`Missing grade threshold for ${grade}`);
      continue;
    }
    
    const { min, max } = scale[grade];
    if (min > max) {
      errors.push(`Grade ${grade} has invalid range: min (${min}) > max (${max})`);
    }
  }
  
  // Check for gaps or overlaps
  const sorted = grades
    .map(g => scale[g])
    .filter(Boolean)
    .sort((a, b) => a.max - b.max);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current.max + 1 !== next.min) {
      errors.push(`Gap/overlap between grades at ${current.max} and ${next.min}`);
    }
  }
  
  return errors;
}

/**
 * Pure function to validate scoring configuration
 */
export function validateScoringConfig(config: unknown): ValidationResult<ScoringConfig> {
  if (typeof config !== 'object' || config === null) {
    return { success: false, errors: ['Configuration must be an object'] };
  }
  
  const errors: string[] = [];
  const cfg = config as Partial<ScoringConfig>;
  
  if (typeof cfg.base_score !== 'number' || cfg.base_score < 0 || cfg.base_score > 100) {
    errors.push('base_score must be a number between 0 and 100');
  }
  
  if (typeof cfg.weights !== 'object' || cfg.weights === null) {
    errors.push('weights must be an object');
  } else {
    errors.push(...validateWeights(cfg.weights as ScoringConfig['weights']));
  }
  
  if (typeof cfg.penalties !== 'object' || cfg.penalties === null) {
    errors.push('penalties must be an object');
  }
  
  if (typeof cfg.grading_scale !== 'object' || cfg.grading_scale === null) {
    errors.push('grading_scale must be an object');
  } else {
    errors.push(...validateGradingScale(cfg.grading_scale as ScoringConfig['grading_scale']));
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return { success: true, data: config as ScoringConfig };
}

/**
 * Pure function to validate Spectral ruleset
 */
export function validateRuleset(config: unknown): ValidationResult<SpectralRuleset> {
  if (typeof config !== 'object' || config === null) {
    return { success: false, errors: ['Ruleset must be an object'] };
  }
  
  const errors: string[] = [];
  const ruleset = config as Partial<SpectralRuleset>;
  
  // extends is optional - rulesets are merged in auditor
  if (ruleset.extends !== undefined && !Array.isArray(ruleset.extends)) {
    errors.push('extends must be an array of strings if provided');
  }
  
  if (typeof ruleset.rules !== 'object' || ruleset.rules === null) {
    errors.push('rules must be an object');
  } else {
    for (const [ruleId, rule] of Object.entries(ruleset.rules)) {
      if (typeof rule !== 'object' || rule === null) {
        errors.push(`Rule ${ruleId} must be an object`);
        continue;
      }
      
      const r = rule as unknown as Record<string, unknown>;
      if (typeof r.description !== 'string') {
        errors.push(`Rule ${ruleId} missing required field: description`);
      }
      if (!['error', 'warn', 'info', 'hint'].includes(r.severity as string)) {
        errors.push(`Rule ${ruleId} has invalid severity: ${r.severity}`);
      }
    }
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return { success: true, data: config as SpectralRuleset };
}

/**
 * Loads and parses a YAML file
 */
function loadYamlFile<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new ConfigLoadError(`Configuration file not found: ${filePath}`, filePath);
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(content) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new ConfigLoadError(
      `Failed to parse YAML: ${message}`,
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Configuration loader class
 * Implements dependency injection pattern for testability
 */
export class ConfigLoader {
  private configDir: string;
  private _scoringConfig: ScoringConfig | undefined;
  private _rulesetConfig: SpectralRuleset | undefined;

  constructor(configDir: string = DEFAULT_CONFIG_DIR) {
    this.configDir = path.resolve(configDir);
  }

  /**
   * Loads scoring configuration from scoring.yaml
   */
  loadScoringConfig(): ScoringConfig {
    if (this._scoringConfig) {
      return this._scoringConfig;
    }

    const filePath = path.join(this.configDir, 'scoring.yaml');
    const rawConfig = loadYamlFile<unknown>(filePath);
    
    const validation = validateScoringConfig(rawConfig);
    if (!validation.success || !validation.data) {
      throw new ConfigLoadError(
        `Invalid scoring configuration: ${validation.errors?.join(', ')}`,
        filePath
      );
    }
    
    this._scoringConfig = validation.data;
    return this._scoringConfig;
  }

  /**
   * Loads Spectral ruleset from ruleset.yaml
   */
  loadRulesetConfig(): SpectralRuleset {
    if (this._rulesetConfig) {
      return this._rulesetConfig;
    }

    const filePath = path.join(this.configDir, 'ruleset.yaml');
    const rawConfig = loadYamlFile<unknown>(filePath);
    
    const validation = validateRuleset(rawConfig);
    if (!validation.success || !validation.data) {
      throw new ConfigLoadError(
        `Invalid ruleset configuration: ${validation.errors?.join(', ')}`,
        filePath
      );
    }
    
    // Resolve function names to actual functions
    this._rulesetConfig = resolveRuleFunctions(validation.data);
    return this._rulesetConfig;
  }

  /**
   * Loads both configurations
   */
  loadAll(): { scoring: ScoringConfig; ruleset: SpectralRuleset } {
    return {
      scoring: this.loadScoringConfig(),
      ruleset: this.loadRulesetConfig()
    };
  }

  /**
   * Clears cached configurations
   */
  clearCache(): void {
    this._scoringConfig = undefined as unknown as ScoringConfig | undefined;
    this._rulesetConfig = undefined as unknown as SpectralRuleset | undefined;
  }
}

// Export factory function for convenience
export function createConfigLoader(configDir?: string): ConfigLoader {
  return new ConfigLoader(configDir);
}

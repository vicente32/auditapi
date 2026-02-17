/**
 * CLI Entry Point - AuditAPI
 * Command-line interface using Commander.js
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { createConfigLoader } from '../config/loader';
import { Auditor } from '../core/auditor';
import { AuditResult, Violation } from '../types/config';

const program = new Command();

// Grade order for comparison (higher is better)
const GRADE_ORDER: Record<string, number> = {
  'A': 5,
  'B': 4,
  'C': 3,
  'D': 2,
  'F': 1
};

/**
 * Checks if a grade meets the minimum requirement
 */
function meetsMinimumGrade(actualGrade: string, minimumGrade: string): boolean {
  return GRADE_ORDER[actualGrade] >= GRADE_ORDER[minimumGrade];
}

/**
 * Filters violations based on severity
 */
function filterViolations(violations: Violation[], showAll: boolean): Violation[] {
  if (showAll) {
    return violations;
  }
  // Only show errors and fatal violations in non-verbose mode
  return violations.filter(v => v.severity === 'error');
}

/**
 * Formats audit result for human-readable output
 */
function formatHumanOutput(result: AuditResult, verbose: boolean): string {
  const gradeColor = result.grade === 'A' ? '\x1b[32m' :  // Green
                     result.grade === 'B' ? '\x1b[34m' :  // Blue
                     result.grade === 'C' ? '\x1b[33m' :  // Yellow
                     result.grade === 'D' ? '\x1b[35m' :  // Magenta
                     '\x1b[31m';                          // Red
  const reset = '\x1b[0m';
  
  let output = '\n';
  output += '╔══════════════════════════════════════════════════════════╗\n';
  output += `║           ${gradeColor}AUDITAPI REPORT${reset}                        ║\n`;
  output += '╚══════════════════════════════════════════════════════════╝\n\n';
  
  output += `📄 File:     ${result.filePath}\n`;
  output += `⏱️  Duration: ${result.duration}ms\n`;
  output += `📅 Time:     ${result.timestamp}\n\n`;
  
  output += `${gradeColor}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}\n`;
  output += `${gradeColor}                    FINAL GRADE: ${result.grade}${reset}\n`;
  output += `${gradeColor}                    SCORE: ${result.finalScore}/100${reset}\n`;
  output += `${gradeColor}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}\n\n`;
  
  output += 'Category Breakdown:\n';
  for (const cat of result.categoryBreakdown) {
    const status = cat.pointsDeducted === 0 ? '✅' : '⚠️ ';
    output += `  ${status} ${cat.category.padEnd(15)} Weight: ${cat.weight.toFixed(2)}  Penalty: ${cat.pointsDeducted}\n`;
  }
  
  output += '\n📊 Summary:\n';
  output += `   Total Violations: ${result.summary.totalViolations}\n`;
  output += `   ❌ Errors:         ${result.summary.errorCount}\n`;
  output += `   ⚠️  Warnings:       ${result.summary.warningCount}\n`;
  output += `   ℹ️  Info:           ${result.summary.infoCount}\n`;
  if (result.summary.fatalCount > 0) {
    output += `   💀 Fatal:          ${result.summary.fatalCount}\n`;
  }

  if (result.notes && result.notes.length > 0) {
    output += '\n📝 Notes:\n';
    for (const note of result.notes) {
      output += `   ⚠️  ${note}\n`;
    }
  }

  if (result.hasFatalErrors) {
    output += `\n${'\x1b[31m'}⚠️  FATAL ERRORS DETECTED - Grade automatically set to F${reset}\n`;
  }

  output += `\n${result.passed ? '\x1b[32m✅ PASSED\x1b[0m' : '\x1b[31m❌ FAILED\x1b[0m'}\n`;
  
  // Filter violations based on verbose mode
  const filteredViolations = filterViolations(result.violations, verbose);
  const hiddenViolations = result.violations.length - filteredViolations.length;
  
  if (filteredViolations.length > 0) {
    output += '\n\nDetailed Violations:\n';
    output += '──────────────────────────────────────────────────────────\n';
    
    for (const v of filteredViolations) {
      const severityIcon = v.severity === 'error' ? '❌' :
                           v.severity === 'warn' ? '⚠️ ' : 'ℹ️ ';
      output += `\n${severityIcon} [${v.ruleId}] ${v.severity.toUpperCase()}\n`;
      output += `   ${v.message}\n`;
      output += `   Path: ${v.path}\n`;
      if (v.line) {
        output += `   Line: ${v.line}${v.column ? `:${v.column}` : ''}\n`;
      }
    }
  }
  
  // Show message about hidden violations in non-verbose mode
  if (!verbose && hiddenViolations > 0) {
    const violationWord = hiddenViolations === 1 ? 'violation' : 'violations';
    output += `\n\n📌 Run with --verbose to see ${hiddenViolations} more ${violationWord}...\n`;
  }
  
  return output;
}

/**
 * Main audit command
 */
program
  .name('auditapi')
  .description('CLI tool for auditing OpenAPI specifications with quality scoring')
  .version('1.0.0');

program
  .command('audit')
  .description('Audit an OpenAPI specification file')
  .argument('<file>', 'Path to the OpenAPI file (YAML or JSON)')
  .option('-c, --config <path>', 'Path to config directory', './config')
  .option('-j, --json', 'Output results as JSON')
  .option('-o, --output <file>', 'Write output to file')
  .option('-v, --verbose', 'Show all violations including warnings and info', false)
  .option('--fail-on <grade>', 'Minimum passing grade (A, B, C, D). Fails if below.', 'D')
  .action(async (file: string, options) => {
    try {
      // Validate file exists
      const resolvedPath = path.resolve(file);
      if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ Error: File not found: ${file}`);
        process.exit(1);
      }
      
      // Validate config directory exists
      const configPath = path.resolve(options.config);
      if (!fs.existsSync(configPath)) {
        console.error(`❌ Error: Config directory not found: ${options.config}`);
        process.exit(1);
      }
      
      // Validate fail-on grade
      const validGrades = ['A', 'B', 'C', 'D', 'F'];
      const failOnGrade = options.failOn.toUpperCase();
      if (!validGrades.includes(failOnGrade)) {
        console.error(`❌ Error: Invalid grade '${options.failOn}'. Must be one of: A, B, C, D, F`);
        process.exit(1);
      }
      
      // Load configuration
      const configLoader = createConfigLoader(configPath);
      
      try {
        configLoader.loadAll();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error loading configuration: ${message}`);
        process.exit(1);
      }
      
      // Run audit
      const auditor = new Auditor(configLoader);
      const result = await auditor.audit(resolvedPath);
      
      // Format output
      const output = options.json 
        ? JSON.stringify(result, null, 2) 
        : formatHumanOutput(result, options.verbose);
      
      // Write or print output
      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.log(`✅ Results written to: ${options.output}`);
      } else {
        console.log(output);
      }
      
      // Exit with error code based on fail-on grade
      const passed = meetsMinimumGrade(result.grade, failOnGrade);
      if (!passed) {
        process.exit(1);
      }
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Audit failed: ${error.message}`);
        if (error.stack) {
          console.error('\nStack trace:', error.stack);
        }
      } else {
        console.error(`❌ Audit failed: ${String(error)}`);
      }
      process.exit(1);
    }
  });

program
  .command('validate-config')
  .description('Validate configuration files')
  .option('-c, --config <path>', 'Path to config directory', './config')
  .action((options) => {
    try {
      const configPath = path.resolve(options.config);
      
      if (!fs.existsSync(configPath)) {
        console.error(`❌ Error: Config directory not found: ${options.config}`);
        process.exit(1);
      }
      
      const configLoader = createConfigLoader(configPath);
      configLoader.loadAll();
      
      console.log('✅ Configuration files are valid');
      
      const { scoring, ruleset } = configLoader.loadAll();
      
      console.log(`\n📊 Scoring Configuration:`);
      console.log(`   Base Score: ${scoring.base_score}`);
      console.log(`   Categories: ${Object.keys(scoring.weights).join(', ')}`);
      console.log(`   Penalties: ${Object.keys(scoring.penalties).length} rules defined`);
      
      console.log(`\n📋 Ruleset Configuration:`);
      console.log(`   Extends: ${ruleset.extends?.join(', ') ?? 'none (using default OAS rules)'}`);
      console.log(`   Custom Rules: ${Object.keys(ruleset.rules).length} rules defined`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Configuration validation failed: ${message}`);
      process.exit(1);
    }
  });

// Parse CLI arguments
program.parse();

// Handle no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

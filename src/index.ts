/**
 * AuditAPI - Main entry point
 * OpenAPI specification auditing tool with quality scoring
 */

export { ConfigLoader, createConfigLoader } from './config/loader';
export { Auditor } from './core/auditor';
export * from './types/config';

// Version
export const VERSION = '1.0.0';

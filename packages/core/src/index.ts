/**
 * @module @subnetter/core
 * @description Core library for hierarchical IPv4 CIDR allocation.
 *
 * Subnetter automates the planning of IP address space for multi-cloud,
 * multi-account infrastructure. It generates non-overlapping subnet
 * allocations following a hierarchical model: base CIDR → accounts →
 * regions → availability zones → subnets.
 *
 * ## Key Features
 *
 * - **Multi-cloud support**: AWS, Azure, and GCP with provider-specific AZ naming
 * - **Hierarchical allocation**: Automatic subdivision at account, region, and AZ levels
 * - **Configurable sizing**: Control prefix lengths at each hierarchy level
 * - **Deterministic output**: Same config always produces same allocations
 * - **Validation**: Built-in overlap detection and configuration validation
 *
 * ## Quick Start
 *
 * @example
 * ```typescript
 * import {
 *   loadConfig,
 *   CidrAllocator,
 *   writeAllocationsToCsv
 * } from '@subnetter/core';
 *
 * // Load and validate configuration
 * const config = loadConfig('./config.json');
 *
 * // Generate allocations
 * const allocator = new CidrAllocator(config);
 * const allocations = allocator.generateAllocations();
 *
 * // Write to CSV
 * await writeAllocationsToCsv(allocations, './allocations.csv');
 *
 * console.log(`Generated ${allocations.length} subnet allocations`);
 * ```
 *
 * ## Configuration Example
 *
 * @example
 * ```json
 * {
 *   "baseCidr": "10.0.0.0/8",
 *   "prefixLengths": {
 *     "account": 16,
 *     "region": 20,
 *     "az": 24
 *   },
 *   "accounts": [
 *     {
 *       "name": "production",
 *       "clouds": {
 *         "aws": { "regions": ["us-east-1", "us-west-2"] },
 *         "azure": { "regions": ["eastus"] }
 *       }
 *     }
 *   ],
 *   "subnetTypes": {
 *     "public": 26,
 *     "private": 24,
 *     "database": 27
 *   }
 * }
 * ```
 *
 * @see {@link loadConfig} for configuration loading
 * @see {@link CidrAllocator} for allocation generation
 * @see {@link Allocation} for output format
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────────────────────
// Allocation Engine
// ─────────────────────────────────────────────────────────────────────────────

export * from './allocator';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export * from './config/loader';
export * from './config/schema';

// ─────────────────────────────────────────────────────────────────────────────
// Data Models
// ─────────────────────────────────────────────────────────────────────────────

export * from './models/types';

// ─────────────────────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────────────────────

export * from './output/csv-writer';
export * from './output/validator';

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────

export {
  Logger,
  LogLevel,
  configureLogger,
  createLogger,
  parseLogLevel
} from './utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Provider Detection
// ─────────────────────────────────────────────────────────────────────────────

export {
  detectCloudProviderFromRegion,
  CloudProvider
} from './utils/region-detector';

// ─────────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────────

export {
  SubnetterError,
  ErrorCode,
  ConfigurationError,
  AllocationError,
  IOError,
  ValidationError,
  CloudProviderError
} from './utils/errors';

// ─────────────────────────────────────────────────────────────────────────────
// Primary API (explicit exports for discoverability)
// ─────────────────────────────────────────────────────────────────────────────

export { loadConfig, validateConfig } from './config/loader';
export { CidrAllocator } from './allocator/core/allocator';
export { writeAllocationsToCsv, filterAllocationsByProvider } from './output/csv-writer';
export { validateNoOverlappingCidrs } from './output/validator';

// ─────────────────────────────────────────────────────────────────────────────
// Allocation Components (for advanced usage and testing)
// ─────────────────────────────────────────────────────────────────────────────

export { SubnetAllocator } from './allocator/core/subnet';
export { CidrTracker } from './allocator/utils/tracking';

// ─────────────────────────────────────────────────────────────────────────────
// CIDR Utilities
// ─────────────────────────────────────────────────────────────────────────────

export {
  isValidIpv4Cidr,
  calculateUsableIps,
  doCidrsOverlap,
  subdivideIpv4Cidr,
  calculateOptimalPrefixLength,
  calculateRequiredPrefixLength,
  ContiguousAllocator,
  HierarchicalAllocator
} from './allocator/utils/cidr';

// ─────────────────────────────────────────────────────────────────────────────
// Backward Compatibility Aliases
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use {@link AllocationError} instead
 */
import { AllocationError as CidrError } from './utils/errors';
export { CidrError };

/**
 * @deprecated Use {@link ConfigurationError} instead
 */
export { ConfigurationError as ConfigValidationError } from './utils/errors';

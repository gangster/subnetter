/**
 * @module allocator
 * @description CIDR allocation engine and utilities.
 *
 * This module provides the core allocation functionality for Subnetter,
 * including hierarchical CIDR allocation, overlap tracking, and cloud
 * provider-specific utilities.
 *
 * @remarks
 * The allocator module is organized into:
 * - **Core**: Main allocation classes ({@link CidrAllocator}, {@link SubnetAllocator})
 * - **CIDR utilities**: Validation, calculation, and subdivision functions
 * - **Cloud utilities**: Provider detection and AZ handling
 * - **Tracking**: Overlap detection and space management
 *
 * @example
 * ```typescript
 * import { CidrAllocator } from '@subnetter/core';
 *
 * const allocator = new CidrAllocator(config);
 * const allocations = allocator.generateAllocations();
 * ```
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core Allocators
// ─────────────────────────────────────────────────────────────────────────────

export * from './core/allocator';
export * from './core/region';
export * from './core/subnet';

// ─────────────────────────────────────────────────────────────────────────────
// Common Utilities
// ─────────────────────────────────────────────────────────────────────────────

export * from './common/errors';
export * from './common/helpers';

// ─────────────────────────────────────────────────────────────────────────────
// CIDR Utilities
// ─────────────────────────────────────────────────────────────────────────────

export * from './utils/cidr/calculator';

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Provider Utilities
// ─────────────────────────────────────────────────────────────────────────────

export * from './utils/cloud/az';
export * from './utils/cloud/provider';

// ─────────────────────────────────────────────────────────────────────────────
// Tracking Utilities
// ─────────────────────────────────────────────────────────────────────────────

export * from './utils/tracking/tracker';
export * from './utils/tracking/space-manager';

// ─────────────────────────────────────────────────────────────────────────────
// Backward Compatibility
// ─────────────────────────────────────────────────────────────────────────────

export * from './cidr-utils';

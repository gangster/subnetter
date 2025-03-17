/**
 * Main entry point for the CIDR allocation functionality
 */

// Core allocators
export * from './core/allocator';
export * from './core/region';
export * from './core/subnet';

// Common utilities
export * from './common/errors';
export * from './common/helpers';

// CIDR utilities
export * from './utils/cidr/calculator';

// Cloud provider utilities
export * from './utils/cloud/az';
export * from './utils/cloud/provider';

// Tracking utilities
export * from './utils/tracking/tracker';
export * from './utils/tracking/space-manager';

// For backward compatibility
export * from './cidr-utils';

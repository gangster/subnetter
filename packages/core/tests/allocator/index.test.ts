/**
 * This file serves as an entry point for all allocator tests.
 * 
 * It doesn't contain any tests itself but imports all other test files
 * to make it easier to run all allocator tests at once.
 */

// Import core tests
import './core/allocator.test';

// Import utility tests
import './utils/cidr/calculator.test';
import './utils/tracking/tracker.test';
import './utils/tracking/space-manager.test';
import './utils/cloud/provider.test';
import './utils/cloud/provider-detection.test';
import './utils/cloud/az.test'; 
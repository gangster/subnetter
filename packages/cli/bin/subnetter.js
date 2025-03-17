#!/usr/bin/env node

// This script determines whether to use ESM or CommonJS based on the Node.js environment
const { execPath } = process;
const { createRequire } = require('module');
const { resolve } = require('path');

// Detect if ESM is supported
let isESM = false;
try {
  // If import() works, ESM is supported
  require = createRequire(import.meta.url);
  isESM = true;
} catch (error) {
  // CommonJS environment
  isESM = false;
}

// Use the appropriate module version
if (isESM) {
  import('../dist/index.js').catch(err => {
    console.error('Failed to load ESM version:', err);
    process.exit(1);
  });
} else {
  // Use CommonJS version
  require('../dist/cjs/index.js');
}

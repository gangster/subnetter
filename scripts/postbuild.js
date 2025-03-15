#!/usr/bin/env node

/**
 * Post-build script to ensure the CLI executable works correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to the CLI file
const cliPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');

// Ensure the CLI directory exists
const cliDir = path.join(__dirname, '..', 'dist', 'cli');
if (!fs.existsSync(cliDir)) {
  console.error(`CLI directory not found at ${cliDir}. TypeScript compilation may have failed.`);
  process.exit(1);
}

// Check if the CLI file exists
if (!fs.existsSync(cliPath)) {
  console.error(`CLI file not found at ${cliPath}. TypeScript compilation may have failed.`);
  process.exit(1);
}

// Add shebang if it doesn't exist
let content = fs.readFileSync(cliPath, 'utf8');
if (!content.startsWith('#!/usr/bin/env node')) {
  console.log('Adding shebang to CLI file');
  content = `#!/usr/bin/env node\n${content}`;
  fs.writeFileSync(cliPath, content, 'utf8');
}

// Set executable permissions
try {
  console.log('Setting executable permissions on CLI file');
  execSync(`chmod +x ${cliPath}`);
  console.log('✅ CLI file is now executable');
} catch (error) {
  console.error('Failed to set executable permissions:', error.message);
  // Don't exit with error as this might fail on Windows
}

console.log('✅ Post-build tasks completed successfully'); 
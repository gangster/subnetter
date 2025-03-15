// Simple build script to bypass package manager issues with Node.js v22
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, '../..');

// Directly use the Astro CLI from the workspace root's node_modules
const astroPath = join(workspaceRoot, 'node_modules', '.bin', 'astro');

console.log('Building Astro documentation...');
console.log(`Using Astro from: ${astroPath}`);

// Execute astro build
if (!existsSync(astroPath)) {
  console.error(`Astro executable not found at ${astroPath}`);
  process.exit(1);
}

exec(`"${astroPath}" build`, { cwd: __dirname }, (err, stdout, stderr) => {
  if (err) {
    console.error('Error building documentation:', err);
    if (stderr) console.error(stderr);
    return process.exit(1);
  }

  console.log(stdout);
  console.log('Documentation built successfully!');
}); 
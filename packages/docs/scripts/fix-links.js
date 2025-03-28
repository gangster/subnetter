#!/usr/bin/env node

/**
 * This script fixes links in the HTML files generated by Astro
 * by ensuring all relative links include the correct base path.
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

const DIST_DIR = resolve('./dist');
const BASE_PATH = '/subnetter';

// Process HTML files to fix links
async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    // Fix links that are missing the base path
    const fixedContent = content.replace(
      /href="\/((?!subnetter|http|#)[^"]+)"/g, 
      `href="${BASE_PATH}/$1"`
    );
    
    if (content !== fixedContent) {
      console.log(`Fixed links in: ${filePath}`);
      await writeFile(filePath, fixedContent, 'utf8');
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Find and process all HTML files
async function processDirectory(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(directory, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else if (entry.name.endsWith('.html')) {
        await processFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
  }
}

// Main function
async function main() {
  console.log('Fixing links in build output...');
  await processDirectory(DIST_DIR);
  console.log('Link fixing complete!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 
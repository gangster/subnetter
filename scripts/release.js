#!/usr/bin/env node

/**
 * Helper script for creating a new release
 * Usage: node scripts/release.js [patch|minor|major]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get the package.json content
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = require(packageJsonPath);
const currentVersion = packageJson.version;

// Parse the version type argument
const args = process.argv.slice(2);
const versionType = args[0] || 'patch';

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('Error: Version type must be one of: patch, minor, major');
  process.exit(1);
}

// Calculate the new version
let [major, minor, patch] = currentVersion.split('.').map(Number);

if (versionType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (versionType === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const newVersion = `${major}.${minor}.${patch}`;

// Confirm the version change
rl.question(`Update version from ${currentVersion} to ${newVersion}? (y/n) `, (answer) => {
  if (answer.toLowerCase() !== 'y') {
    console.log('Release cancelled');
    rl.close();
    return;
  }

  try {
    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json version to ${newVersion}`);

    // Create commit
    execSync(`git add package.json`, { stdio: 'inherit' });
    execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
    console.log('✅ Created version commit');

    // Create tag
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit' });
    console.log(`✅ Created git tag v${newVersion}`);

    console.log('\n🚀 Ready to release! Run the following command to push:');
    console.log(`git push origin main && git push origin v${newVersion}`);

  } catch (error) {
    console.error('Error during release process:', error.message);
  } finally {
    rl.close();
  }
}); 
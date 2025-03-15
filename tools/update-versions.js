const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get the new version from command line arguments
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Please provide a version number');
  process.exit(1);
}

// Update version in a package.json file
function updateVersion(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const pkg = JSON.parse(content);
    pkg.version = newVersion;

    // Also update workspace dependencies if they exist
    if (pkg.dependencies) {
      Object.keys(pkg.dependencies).forEach(dep => {
        if (dep.startsWith('@subnetter/')) {
          pkg.dependencies[dep] = newVersion;
        }
      });
    }

    // Update devDependencies as well
    if (pkg.devDependencies) {
      Object.keys(pkg.devDependencies).forEach(dep => {
        if (dep.startsWith('@subnetter/')) {
          pkg.devDependencies[dep] = newVersion;
        }
      });
    }

    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated ${filePath} to version ${newVersion}`);
  } catch (err) {
    console.error(`Error updating ${filePath}:`, err);
    process.exit(1);
  }
}

// Find and update all package.json files
const rootPkg = path.join(process.cwd(), 'package.json');
updateVersion(rootPkg);

// Update workspace packages
const workspacePkgs = glob.sync('packages/*/package.json', { cwd: process.cwd() });
workspacePkgs.forEach(pkgPath => {
  updateVersion(path.join(process.cwd(), pkgPath));
}); 
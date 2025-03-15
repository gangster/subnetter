#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Define paths
const binDir = path.resolve(__dirname, "../bin");
const binFile = path.resolve(binDir, "subnetter");

// Create bin directory if it doesn't exist
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

// Create the bin file with the appropriate shebang
const binContent = `#!/usr/bin/env node

require("../dist/index.js");
`;

// Write the bin file
fs.writeFileSync(binFile, binContent);

// Make the bin file executable
fs.chmodSync(binFile, "755");

console.log(`Created bin file at ${binFile}`);

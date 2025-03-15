#!/usr/bin/env node
/**
 * Script to migrate documentation from the docs directory to the Astro project
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const rootDir = path.resolve(__dirname, '../../..');
const sourceDocsDir = path.join(rootDir, 'docs');
const targetDocsDir = path.join(__dirname, '..', 'src', 'content', 'docs');

// Files to migrate and their destinations
const filesToMigrate = [
  { src: 'README.md', dest: 'index.mdx' },
  { src: 'USER_GUIDE.md', dest: 'user-guide.mdx' },
  { src: 'ARCHITECTURE.md', dest: 'architecture.mdx' },
  { src: 'DEVELOPER_GUIDE.md', dest: 'developer-guide.mdx' },
  { src: 'API_INDEX.md', dest: 'api/overview.mdx' },
  { src: 'API_REFERENCE.md', dest: 'api/reference.mdx' },
  { src: 'CIDR_PRIMER.md', dest: 'cidr-primer.mdx' },
  { src: 'TROUBLESHOOTING.md', dest: 'troubleshooting.mdx' },
  { src: 'EXAMPLE_SCENARIOS.md', dest: 'example-scenarios.mdx' },
  { src: 'PROJECT_STRUCTURE.md', dest: 'project/structure.mdx' },
  { src: 'MANUAL_TESTING_GUIDE.md', dest: 'project/manual-testing.mdx' },
];

/**
 * Transforms Markdown content to be compatible with Astro/MDX
 * @param {string} content - The Markdown content
 * @param {string} fileName - The name of the file
 * @returns {string} - Transformed content
 */
function transformContent(content, fileName) {
  // Add front matter to the content
  const title = fileName
    .replace(/\.mdx?$/, '')
    .replace(/^.*\//, '')
    .replace(/-/g, ' ')
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  
  let frontMatter = `---\ntitle: ${title}\n`;
  
  // Add description based on the content
  const descriptionMatch = content.match(/^# .*\n+(.+?)\n/);
  if (descriptionMatch && descriptionMatch[1]) {
    frontMatter += `description: "${descriptionMatch[1].replace(/"/g, '\\"')}"\n`;
  }
  
  frontMatter += '---\n\n';
  
  // Add single import for MermaidDiagram at the top if needed
  let hasMermaidDiagram = content.includes('```mermaid');
  let importStatement = hasMermaidDiagram ? 
    'import MermaidDiagram from \'../../components/MermaidDiagram.astro\';\n\n' : '';
  
  // Transform Mermaid code blocks to use the Mermaid component
  let transformedContent = content.replace(/```mermaid\n([\s\S]*?)```/g, (match, chartContent) => {
    return `<MermaidDiagram chart={\`${chartContent.trim()}\`} />`;
  });
  
  // Fix any other incompatibilities
  transformedContent = transformedContent
    // Replace HTML comments with MDX comments
    .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}')
    // Make sure code blocks have proper syntax highlighting
    .replace(/```(\w+)/g, (match, lang) => {
      if (lang === 'bash' || lang === 'sh') {
        return '```bash';
      }
      return match;
    });
  
  return frontMatter + importStatement + transformedContent;
}

/**
 * Creates the necessary directories for a file path
 * @param {string} filePath - The file path
 */
async function ensureDirectories(filePath) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
}

/**
 * Migrates a single file
 * @param {Object} file - The file to migrate
 */
async function migrateFile(file) {
  const sourcePath = path.join(sourceDocsDir, file.src);
  const targetPath = path.join(targetDocsDir, file.dest);
  
  try {
    // Check if source file exists
    await fs.access(sourcePath);
    
    // Read the source file
    const content = await fs.readFile(sourcePath, 'utf8');
    
    // Transform the content
    const transformedContent = transformContent(content, file.dest);
    
    // Ensure target directories exist
    await ensureDirectories(targetPath);
    
    // Write the transformed content to the target file
    await fs.writeFile(targetPath, transformedContent);
    
    console.log(`Migrated ${file.src} to ${file.dest}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Warning: Source file ${file.src} does not exist. Skipping.`);
    } else {
      console.error(`Error migrating ${file.src}:`, error);
    }
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('Starting documentation migration...');
  
  // Process each file in parallel
  await Promise.all(filesToMigrate.map(migrateFile));
  
  console.log('Migration complete!');
}

// Run the migration
migrate().catch(console.error); 
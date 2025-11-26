import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
// CLI path for running the commands
const CLI_PATH = path.resolve('packages/cli/dist/index.js');
const TEST_DIR = path.resolve('__tests__/e2e/fixtures');
const OUTPUT_DIR = path.resolve('__tests__/e2e/outputs');

// Define types for our test data - matching current schema
interface TestConfig {
  baseCidr: string;
  cloudProviders?: string[];
  accounts: Array<{
    name: string;
    clouds: {
      [provider: string]: {
        baseCidr?: string;
        regions: string[];
      }
    };
  }>;
  subnetTypes: { [name: string]: number };
  prefixLengths?: {
    account?: number;
    region?: number;
    az?: number;
  };
}

interface Allocation {
  'Account Name': string;
  'VPC Name': string;
  'Cloud Provider': string;
  'Region Name': string;
  'Availability Zone': string;
  'Region CIDR': string;
  'VPC CIDR': string;
  'AZ CIDR': string;
  'Subnet CIDR': string;
  'CIDR': string;
  'Subnet Role': string;
  'Usable IPs': string;
  [key: string]: string;
}

type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

// Ensure our test directories exist
beforeAll(() => {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
});

// Helper to create config files for testing
async function createConfigFile(config: TestConfig, filename: string): Promise<string> {
  const configPath = path.join(TEST_DIR, filename);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

// Helper to run the CLI command
async function runCli(args: string[]): Promise<ExecResult> {
  // Use Node to directly run the CLI package
  const command = `node ${CLI_PATH} ${args.join(' ')}`;
  try {
    const { stdout, stderr } = await execAsync(command);
    return {
      stdout,
      stderr,
      exitCode: 0
    };
  } catch (error: any) {
    console.error(`CLI execution error: ${error.message}`);
    console.error(`Command: ${command}`);
    console.error(`Stdout: ${error.stdout || 'No stdout'}`);
    console.error(`Stderr: ${error.stderr || 'No stderr'}`);
    
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1
    };
  }
}

// Helper to parse CSV output
function parseCSV(csvPath: string): Allocation[] {
  if (!fs.existsSync(csvPath)) {
    return [];
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length <= 1) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return headers.reduce<Allocation>((obj, header, i) => {
      obj[header] = values[i];
      return obj;
    }, {} as Allocation);
  });
}

describe('Subnetter E2E Tests', () => {
  // First ensure the output directories exist
  beforeAll(() => {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  });

  // Test Case 1: Basic Single Account Allocation
  test('should generate allocations for a single account with one region', async () => {
    // Create a basic config
    const config: TestConfig = {
      baseCidr: '10.0.0.0/8', // Use a larger CIDR block to allow proper subdivision
      prefixLengths: {
        account: 16,
        region: 20, 
        az: 24
      },
      cloudProviders: ['aws'],
      accounts: [
        { 
          name: 'test-account', 
          clouds: {
            aws: {
              regions: ['us-east-1']
            }
          }
        }
      ],
      subnetTypes: {
        Public: 26,
        Private: 28
      }
    };
    
    const configPath = await createConfigFile(config, 'basic-config.json');
    const outputPath = path.join(OUTPUT_DIR, 'basic-output.csv');
    
    // Run the CLI with the flag syntax: generate -c <config-file> -o <output-file>
    const { stdout, stderr, exitCode } = await runCli(['generate', '-c', configPath, '-o', outputPath]);
    
    // Verify successful execution
    expect(exitCode).toBe(0);
    expect(stderr).not.toContain('error');
    expect(stdout).toContain('Successfully generated');
    
    // Check that the output file exists
    expect(fs.existsSync(outputPath)).toBe(true);
    
    // Parse and validate the CSV content
    const allocations = parseCSV(outputPath);
    // 1 account × 1 region × 3 AZs × 2 subnet types = 6 allocations
    expect(allocations.length).toBe(6);
    
    // Verify allocation properties
    expect(allocations[0]['Account Name']).toBe('test-account');
    expect(allocations[0]['Cloud Provider']).toBe('aws');
    expect(allocations.some(a => a['Subnet Role'] === 'Public')).toBe(true);
    expect(allocations.some(a => a['Subnet Role'] === 'Private')).toBe(true);
  });

  // Test Case 2: Multiple Accounts with Multiple Regions
  test('should generate allocations for multiple accounts across regions', async () => {
    const config: TestConfig = {
      baseCidr: '10.0.0.0/8',
      prefixLengths: {
        account: 16,
        region: 20,
        az: 24
      },
      cloudProviders: ['aws'],
      accounts: [
        { 
          name: 'dev-account', 
          clouds: {
            aws: {
              regions: ['us-east-1', 'us-west-2']
            }
          }
        },
        { 
          name: 'prod-account', 
          clouds: {
            aws: {
              regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1']
            }
          }
        }
      ],
      subnetTypes: {
        Public: 26,
        Private: 28
      }
    };
    
    const configPath = await createConfigFile(config, 'multi-account-config.json');
    const outputPath = path.join(OUTPUT_DIR, 'multi-account-output.csv');
    
    const { stdout, stderr, exitCode } = await runCli(['generate', '-c', configPath, '-o', outputPath]);
    
    expect(exitCode).toBe(0);
    expect(stderr).not.toContain('error');
    expect(stdout).toContain('Successfully generated');
    
    const allocations = parseCSV(outputPath);
    // 2 accounts with 2+3 regions = 5 regions total
    // 5 regions × 3 AZs × 2 subnet types = 30 allocations
    expect(allocations.length).toBe(30);
    
    // Check that both accounts appear in the output
    const accountNames = [...new Set(allocations.map(a => a['Account Name']))];
    expect(accountNames).toContain('dev-account');
    expect(accountNames).toContain('prod-account');
    
    // Check that all regions appear in the output
    const regions = [...new Set(allocations.map(a => a['Region Name']))];
    expect(regions).toContain('us-east-1');
    expect(regions).toContain('us-west-2');
    expect(regions).toContain('eu-west-1');
    expect(regions).toContain('ap-southeast-1');
  });

  // Test Case 3: Multicloud Environment
  test('should handle multicloud environments with different providers', async () => {
    const config: TestConfig = {
      baseCidr: '10.0.0.0/8',
      prefixLengths: {
        account: 16,
        region: 20,
        az: 24
      },
      cloudProviders: ['aws', 'azure', 'gcp'],
      accounts: [
        { 
          name: 'cloud-dev', 
          clouds: {
            aws: {
              regions: ['us-east-1']
            },
            azure: {
              regions: ['eastus']
            },
            gcp: {
              regions: ['us-central1']
            }
          }
        },
        { 
          name: 'cloud-prod', 
          clouds: {
            aws: {
              baseCidr: '172.16.0.0/16',
              regions: ['us-west-2']
            },
            azure: {
              baseCidr: '172.17.0.0/16',
              regions: ['westus2']
            },
            gcp: {
              baseCidr: '172.18.0.0/16',
              regions: ['europe-west1']
            }
          }
        }
      ],
      subnetTypes: {
        Public: 26,
        Private: 27,
        Shared: 28
      }
    };
    
    const configPath = await createConfigFile(config, 'multicloud-config.json');
    const outputPath = path.join(OUTPUT_DIR, 'multicloud-output.csv');
    
    const { exitCode, stderr } = await runCli(['generate', '-c', configPath, '-o', outputPath]);
    
    expect(exitCode).toBe(0);
    expect(stderr).not.toContain('error');
    
    const allocations = parseCSV(outputPath);
    
    // Verify provider detection works based on region naming
    const awsAllocations = allocations.filter(a => 
      a['Region Name'] === 'us-east-1' || a['Region Name'] === 'us-west-2');
    const azureAllocations = allocations.filter(a => 
      a['Region Name'] === 'eastus' || a['Region Name'] === 'westus2');
    const gcpAllocations = allocations.filter(a => 
      a['Region Name'] === 'us-central1' || a['Region Name'] === 'europe-west1');
    
    console.log('AWS allocations:', awsAllocations.map(a => ({ region: a['Region Name'], provider: a['Cloud Provider'] })));
    console.log('Azure allocations:', azureAllocations.map(a => ({ region: a['Region Name'], provider: a['Cloud Provider'] })));
    console.log('GCP allocations:', gcpAllocations.map(a => ({ region: a['Region Name'], provider: a['Cloud Provider'] })));
    
    expect(awsAllocations.every(a => a['Cloud Provider'] === 'aws')).toBe(true);
    expect(azureAllocations.every(a => a['Cloud Provider'] === 'azure')).toBe(true);
    expect(gcpAllocations.every(a => a['Cloud Provider'] === 'gcp')).toBe(true);
    
    // Verify account-specific CIDR override works (each cloud has its own 172.x.x.x CIDR)
    const prodAllocations = allocations.filter(a => a['Account Name'] === 'cloud-prod');
    expect(prodAllocations.every(a => a['VPC CIDR'].startsWith('172.'))).toBe(true);
  });
}); 
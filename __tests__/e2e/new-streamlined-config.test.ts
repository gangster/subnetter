import path from 'path';
import fs from 'fs';
import { loadConfig } from '../../packages/core/src/config/loader';
import { CidrAllocator } from '../../packages/core/src/allocator';

describe('New Streamlined Configuration End-to-End Test', () => {
  const configPath = path.join(__dirname, 'fixtures', 'streamlined-format.json');
  
  beforeAll(() => {
    console.log(`Configuration path: ${configPath}`);
    // Check if the configuration file exists
    if (fs.existsSync(configPath)) {
      console.log('Configuration file exists');
      const content = fs.readFileSync(configPath, 'utf8');
      console.log(`Configuration content: ${content}`);
    } else {
      console.error('Configuration file does not exist');
    }
  });
  
  it('should load and process a streamlined configuration file', () => {
    // Load the configuration
    const config = loadConfig(configPath);
    
    // Verify the configuration was loaded correctly
    expect(config).toBeDefined();
    expect(config.baseCidr).toBe('10.0.0.0/8');
    
    // Verify subnet types are normalized
    expect(typeof config.subnetTypes).toBe('object');
    expect(Object.keys(config.subnetTypes).length).toBeGreaterThan(0);
    
    // Verify accounts are present
    expect(config.accounts).toBeDefined();
    expect(config.accounts.length).toBeGreaterThan(0);
    
    // Verify the first account has cloud configurations
    const firstAccount = config.accounts[0];
    expect(firstAccount.clouds).toBeDefined();
    expect(Object.keys(firstAccount.clouds).length).toBeGreaterThan(0);
  });
  
  it('should successfully generate allocations from a streamlined configuration', () => {
    // Load the configuration
    const config = loadConfig(configPath);
    
    // Create a CIDR allocator
    const allocator = new CidrAllocator(config);
    
    // Generate allocations
    const allocations = allocator.generateAllocations();
    
    // Verify allocations were generated
    expect(allocations).toBeDefined();
    expect(allocations.length).toBeGreaterThan(0);
    
    // Verify AWS allocations
    const awsAllocations = allocations.filter(a => a.cloudProvider === 'aws');
    expect(awsAllocations.length).toBeGreaterThan(0);
    
    // Verify Azure allocations
    const azureAllocations = allocations.filter(a => a.cloudProvider === 'azure');
    expect(azureAllocations.length).toBeGreaterThan(0);
    
    // Verify subnet types
    const subnetTypes = [...new Set(allocations.map(a => a.subnetRole))];
    expect(subnetTypes).toContain('Public');
    expect(subnetTypes).toContain('Private');
    
    // Verify prefix lengths
    const publicSubnets = allocations.filter(a => a.subnetRole === 'Public');
    expect(publicSubnets[0].subnetCidr.split('/')[1]).toBe('26');
    
    const privateSubnets = allocations.filter(a => a.subnetRole === 'Private');
    expect(privateSubnets[0].subnetCidr.split('/')[1]).toBe('27');
  });
}); 
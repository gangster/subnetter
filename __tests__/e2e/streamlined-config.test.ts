import path from 'path';
import { loadConfig, CidrAllocator } from '@subnetter/core';

describe('Streamlined Configuration End-to-End Test', () => {
  // Use a file name that doesn't include 'config.json' to avoid Jest mocks
  const configPath = path.resolve(__dirname, 'fixtures/streamlined-format.json');
  
  it('should load and process a streamlined configuration file', async () => {
    try {
      // Load configuration
      const config = loadConfig(configPath);
      
      // Check if the configuration was normalized properly
      expect(typeof config.subnetTypes).toBe('object');
      expect(Object.keys(config.subnetTypes)).toHaveLength(4);
      
      // Verify account structure
      expect(config.accounts).toHaveLength(1);
      expect(config.accounts[0].name).toBe('streamlined-account');
      
      const cloudProviders = Object.keys(config.accounts[0].clouds);
      expect(cloudProviders).toContain('aws');
      expect(cloudProviders).toContain('azure');
      expect(cloudProviders).toContain('gcp');
      
      // Verify subnet types were normalized correctly
      expect(config.subnetTypes.Public).toBe(26);
      expect(config.subnetTypes.Private).toBe(27);
      expect(config.subnetTypes.Data).toBe(28);
      expect(config.subnetTypes.Management).toBe(29);
    } catch (error) {
      throw error;
    }
  });
  
  it('should successfully generate allocations from a streamlined configuration', async () => {
    try {
      // Load configuration
      const config = loadConfig(configPath);
      
      // Initialize the allocator
      const allocator = new CidrAllocator(config);
      
      // Generate allocations
      const allocations = allocator.generateAllocations();
      
      // Verify allocations were generated
      expect(allocations.length).toBeGreaterThan(0);
      
      // Check AWS allocations
      const awsAllocations = allocations.filter(a => a.cloudProvider === 'aws');
      expect(awsAllocations.length).toBeGreaterThan(0);
      
      // Check Azure allocations with custom base CIDR
      const azureAllocations = allocations.filter(a => a.cloudProvider === 'azure');
      expect(azureAllocations.length).toBeGreaterThan(0);
      expect(azureAllocations[0].vpcCidr).toMatch(/^172\.16\./);
      
      // Verify all subnet types are allocated
      const subnetRoles = [...new Set(allocations.map(a => a.subnetRole))];
      expect(subnetRoles).toContain('Public');
      expect(subnetRoles).toContain('Private');
      expect(subnetRoles).toContain('Data');
      expect(subnetRoles).toContain('Management');
      
      // Verify subnet prefix lengths are correct
      const publicSubnets = allocations.filter(a => a.subnetRole === 'Public');
      expect(publicSubnets[0].subnetCidr).toMatch(/\/26$/);
      
      const privateSubnets = allocations.filter(a => a.subnetRole === 'Private');
      expect(privateSubnets[0].subnetCidr).toMatch(/\/27$/);
      
      const dataSubnets = allocations.filter(a => a.subnetRole === 'Data');
      expect(dataSubnets[0].subnetCidr).toMatch(/\/28$/);
      
      const managementSubnets = allocations.filter(a => a.subnetRole === 'Management');
      expect(managementSubnets[0].subnetCidr).toMatch(/\/29$/);
    } catch (error) {
      throw error;
    }
  });
}); 
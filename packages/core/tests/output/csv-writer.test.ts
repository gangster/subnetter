import { writeAllocationsToCsv, filterAllocationsByProvider } from '../../src/output/csv-writer';
import { IOError } from '../../src/utils/errors';
import { Allocation } from '../../src/models/types';
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('csv-writer');

describe('CSV Writer', () => {
  const mockAllocations: Allocation[] = [
    {
      accountName: 'innovation-test',
      vpcName: 'innovation-test-vpc',
      cloudProvider: 'aws',
      regionName: 'us-east-1',
      availabilityZone: 'us-east-1a',
      regionCidr: '10.0.0.0/20',
      vpcCidr: '10.0.0.0/16',
      azCidr: '10.0.0.0/24',
      subnetCidr: '10.0.0.0/28',
      cidr: '10.0.0.0/28',
      subnetRole: 'Public',
      usableIps: 14
    },
    {
      accountName: 'innovation-test',
      vpcName: 'innovation-test-vpc',
      cloudProvider: 'azure',
      regionName: 'eastus',
      availabilityZone: 'eastus1',
      regionCidr: '10.1.0.0/20',
      vpcCidr: '10.1.0.0/16',
      azCidr: '10.1.0.0/24',
      subnetCidr: '10.1.0.0/28',
      cidr: '10.1.0.0/28',
      subnetRole: 'Private',
      usableIps: 14
    }
  ];
  
  const mockOutputPath = '/path/to/output.csv';
  const mockDir = '/path/to';
  
  // Mock CSV writer and its methods
  const mockWriteRecords = jest.fn().mockResolvedValue(undefined);
  const mockCsvWriter = { writeRecords: mockWriteRecords };
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock path.dirname
    (path.dirname as jest.Mock).mockReturnValue(mockDir);
    
    // Mock fs.existsSync and fs.mkdirSync
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {
      // This is intentionally empty as we're just mocking the function
    });
    
    // Mock createObjectCsvWriter
    (createObjectCsvWriter as jest.Mock).mockReturnValue(mockCsvWriter);
  });
  
  describe('writeAllocationsToCsv', () => {
    it('should write allocations to CSV file', async () => {
      await writeAllocationsToCsv(mockAllocations, mockOutputPath);
      
      // Check that createObjectCsvWriter was called with correct parameters
      expect(createObjectCsvWriter).toHaveBeenCalledWith({
        path: mockOutputPath,
        header: expect.arrayContaining([
          { id: 'accountName', title: 'Account Name' },
          { id: 'vpcName', title: 'VPC Name' },
          { id: 'cloudProvider', title: 'Cloud Provider' },
          { id: 'regionName', title: 'Region Name' },
          { id: 'availabilityZone', title: 'Availability Zone' },
          { id: 'regionCidr', title: 'Region CIDR' },
          { id: 'vpcCidr', title: 'VPC CIDR' },
          { id: 'azCidr', title: 'AZ CIDR' },
          { id: 'subnetCidr', title: 'Subnet CIDR' },
          { id: 'cidr', title: 'CIDR' },
          { id: 'subnetRole', title: 'Subnet Role' },
          { id: 'usableIps', title: 'Usable IPs' }
        ])
      });
      
      // Check that writeRecords was called with the allocations
      expect(mockWriteRecords).toHaveBeenCalledWith(mockAllocations);
    });
    
    it('should create directory if it does not exist', async () => {
      // Mock directory does not exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      await writeAllocationsToCsv(mockAllocations, mockOutputPath);
      
      // Check that mkdirSync was called
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockDir, { recursive: true });
    });
    
    it('should throw IOError if writing fails', async () => {
      // Mock writeRecords to throw an error
      const mockError = new Error('Write failed');
      mockWriteRecords.mockRejectedValueOnce(mockError);
      
      await expect(writeAllocationsToCsv(mockAllocations, mockOutputPath))
        .rejects.toThrow(IOError);
    });
  });
  
  describe('filterAllocationsByProvider', () => {
    it('should filter allocations by provider', () => {
      const awsAllocations = filterAllocationsByProvider(mockAllocations, 'aws');
      expect(awsAllocations).toHaveLength(1);
      expect(awsAllocations[0].cloudProvider).toBe('aws');
      
      const azureAllocations = filterAllocationsByProvider(mockAllocations, 'azure');
      expect(azureAllocations).toHaveLength(1);
      expect(azureAllocations[0].cloudProvider).toBe('azure');
    });
    
    it('should handle case-insensitive provider names', () => {
      const awsAllocations = filterAllocationsByProvider(mockAllocations, 'AWS');
      expect(awsAllocations).toHaveLength(1);
      expect(awsAllocations[0].cloudProvider).toBe('aws');
    });
    
    it('should return empty array if no matching provider', () => {
      const gcpAllocations = filterAllocationsByProvider(mockAllocations, 'gcp');
      expect(gcpAllocations).toHaveLength(0);
    });
  });
}); 
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
      subnetRole: 'Private',
      usableIps: 14
    },
    {
      accountName: 'dev-account',
      vpcName: 'dev-account-vpc',
      cloudProvider: 'aws',
      regionName: 'us-west-2',
      availabilityZone: 'us-west-2a',
      regionCidr: '10.2.0.0/20',
      vpcCidr: '10.2.0.0/16',
      azCidr: '10.2.0.0/24',
      subnetCidr: '10.2.0.0/28',
      subnetRole: 'Public',
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
          { id: 'Cloud Provider', title: 'Cloud Provider' },
          { id: 'Account Name', title: 'Account Name' },
          { id: 'VPC Name', title: 'VPC Name' },
          { id: 'Region Name', title: 'Region Name' },
          { id: 'Availability Zone', title: 'Availability Zone' },
          { id: 'Region CIDR', title: 'Region CIDR' },
          { id: 'VPC CIDR', title: 'VPC CIDR' },
          { id: 'AZ CIDR', title: 'AZ CIDR' },
          { id: 'Subnet CIDR', title: 'Subnet CIDR' },
          { id: 'Subnet Role', title: 'Subnet Role' },
          { id: 'Usable IPs', title: 'Usable IPs' }
        ])
      });
      
      // Check that writeRecords was called with sorted and transformed allocations
      expect(mockWriteRecords).toHaveBeenCalled();
      const writtenAllocations = mockWriteRecords.mock.calls[0][0];
      
      // Verify the sorting (aws before azure, and dev-account before innovation-test for aws)
      expect(writtenAllocations[0]['Cloud Provider']).toBe('aws');
      expect(writtenAllocations[0]['Account Name']).toBe('dev-account');
      expect(writtenAllocations[1]['Cloud Provider']).toBe('aws');
      expect(writtenAllocations[1]['Account Name']).toBe('innovation-test');
      expect(writtenAllocations[2]['Cloud Provider']).toBe('azure');
      
      // Verify the fields of the first record
      expect(writtenAllocations[0]['Cloud Provider']).toBe('aws');
      expect(writtenAllocations[0]['Account Name']).toBe('dev-account');
      expect(writtenAllocations[0]['VPC Name']).toBe('dev-account-vpc');
      expect(writtenAllocations[0]['Region Name']).toBe('us-west-2');
      expect(writtenAllocations[0]['Availability Zone']).toBe('us-west-2a');
      expect(writtenAllocations[0]['Region CIDR']).toBe('10.2.0.0/20');
      expect(writtenAllocations[0]['Subnet Role']).toBe('Public');
      expect(writtenAllocations[0]['Usable IPs']).toBe(14);
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
    it('should filter allocations by provider name (case-insensitive)', () => {
      const filteredAws = filterAllocationsByProvider(mockAllocations, 'aws');
      expect(filteredAws).toHaveLength(2);
      expect(filteredAws[0].cloudProvider).toBe('aws');
      expect(filteredAws[1].cloudProvider).toBe('aws');
      
      const filteredAzure = filterAllocationsByProvider(mockAllocations, 'AZURE');
      expect(filteredAzure).toHaveLength(1);
      expect(filteredAzure[0].cloudProvider).toBe('azure');
      
      const filteredGcp = filterAllocationsByProvider(mockAllocations, 'gcp');
      expect(filteredGcp).toHaveLength(0);
    });
  });
}); 
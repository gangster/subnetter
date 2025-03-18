import { createObjectCsvWriter } from 'csv-writer';
import { Allocation } from '../models/types';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';
import { IOError, ErrorCode } from '../utils/errors';

// Create logger instance for output operations
const logger = createLogger('CsvWriter');

/**
 * Writes CIDR allocations to a CSV file.
 * 
 * @param allocations Array of allocation objects
 * @param outputPath Path to the output CSV file
 * @throws {IOError} If the CSV file cannot be written
 */
export async function writeAllocationsToCsv(allocations: Allocation[], outputPath: string): Promise<void> {
  logger.debug(`Writing ${allocations.length} allocations to ${outputPath}`);
  
  try {
    // Ensure the output directory exists
    const directory = path.dirname(outputPath);
    
    if (!fs.existsSync(directory) && directory !== '.') {
      logger.debug(`Creating output directory: ${directory}`);
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Sort allocations by cloudProvider first, then accountName
    const sortedAllocations = [...allocations].sort((a, b) => {
      // First sort by cloud provider
      const cloudComparison = a.cloudProvider.localeCompare(b.cloudProvider);
      if (cloudComparison !== 0) {
        return cloudComparison;
      }
      
      // Then by account name
      const accountComparison = a.accountName.localeCompare(b.accountName);
      if (accountComparison !== 0) {
        return accountComparison;
      }
      
      // Then by region name
      const regionComparison = a.regionName.localeCompare(b.regionName);
      if (regionComparison !== 0) {
        return regionComparison;
      }
      
      // Then by availability zone
      const azComparison = a.availabilityZone.localeCompare(b.availabilityZone);
      if (azComparison !== 0) {
        return azComparison;
      }
      
      // Finally by subnet role
      return a.subnetRole.localeCompare(b.subnetRole);
    });
    
    logger.debug('Allocations sorted by cloud provider and account name');
    
    // Create a CSV-friendly version of the allocations with titles that match the fields
    const csvAllocations = sortedAllocations.map(allocation => ({
      'Cloud Provider': allocation.cloudProvider,
      'Account Name': allocation.accountName,
      'VPC Name': allocation.vpcName,
      'Region Name': allocation.regionName,
      'Availability Zone': allocation.availabilityZone,
      'Region CIDR': allocation.regionCidr,
      'VPC CIDR': allocation.vpcCidr,
      'AZ CIDR': allocation.azCidr,
      'Subnet CIDR': allocation.subnetCidr,
      'Subnet Role': allocation.subnetRole,
      'Usable IPs': allocation.usableIps
    }));
    
    // Define the CSV header - order must match the property order in csvAllocations
    const header = [
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
    ];
    
    logger.trace(`CSV Header: ${header.map(h => h.title).join(', ')}`);
    
    // Create the CSV writer with the defined header
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header
    });
    
    // Write the allocations to the CSV file
    logger.debug('Writing records to CSV');
    await csvWriter.writeRecords(csvAllocations);
    
    logger.info(`Successfully wrote ${sortedAllocations.length} allocations to ${outputPath}`);
  } catch (error) {
    logger.error(`Failed to write CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new IOError(
      `Failed to write allocations to CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ErrorCode.OUTPUT_WRITE_FAILED,
      { outputPath, allocationsCount: allocations.length, rawError: error }
    );
  }
}

/**
 * Filters allocations by cloud provider.
 * 
 * @param allocations Array of allocations to filter
 * @param provider Cloud provider name (case-insensitive)
 * @returns Filtered array of allocations
 */
export function filterAllocationsByProvider(allocations: Allocation[], provider: string): Allocation[] {
  logger.debug(`Filtering allocations by provider: ${provider}`);
  
  const normalizedProvider = provider.toLowerCase();
  const filtered = allocations.filter(allocation => 
    allocation.cloudProvider && allocation.cloudProvider.toLowerCase() === normalizedProvider
  );
  
  logger.debug(`Filtered from ${allocations.length} to ${filtered.length} allocations for provider ${provider}`);
  return filtered;
} 
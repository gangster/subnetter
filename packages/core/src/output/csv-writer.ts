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
    
    // Define the CSV header based on allocation properties
    const header = [
      { id: 'accountName', title: 'Account Name' },
      { id: 'vpcName', title: 'VPC Name' },
      { id: 'cloudProvider', title: 'Cloud Provider' },
      { id: 'regionName', title: 'Region Name' },
      { id: 'availabilityZone', title: 'Availability Zone' },
      { id: 'regionCidr', title: 'Region CIDR' },
      { id: 'vpcCidr', title: 'VPC CIDR' },
      { id: 'azCidr', title: 'AZ CIDR' },
      { id: 'subnetCidr', title: 'Subnet CIDR' },
      { id: 'subnetRole', title: 'Subnet Role' },
      { id: 'usableIps', title: 'Usable IPs' }
    ];
    
    logger.trace(`CSV Header: ${header.map(h => h.title).join(', ')}`);
    
    // Create the CSV writer with the defined header
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header
    });
    
    // Write the allocations to the CSV file
    logger.debug('Writing records to CSV');
    await csvWriter.writeRecords(allocations);
    
    logger.info(`Successfully wrote ${allocations.length} allocations to ${outputPath}`);
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
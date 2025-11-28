/**
 * @module output/csv-writer
 * @description CSV output generation for CIDR allocations.
 *
 * Provides functions to write allocation data to CSV files for use in
 * infrastructure provisioning, documentation, or further processing.
 *
 * @remarks
 * The CSV output includes comprehensive allocation metadata:
 * - Cloud provider, account, VPC, region, and AZ identifiers
 * - CIDR blocks at each hierarchy level
 * - Subnet role and usable IP count
 *
 * Output is sorted by cloud provider, account, region, AZ, and subnet role
 * for consistent, readable results.
 *
 * @example
 * ```typescript
 * import {
 *   CidrAllocator,
 *   loadConfig,
 *   writeAllocationsToCsv,
 *   filterAllocationsByProvider
 * } from '@subnetter/core';
 *
 * const config = loadConfig('./config.json');
 * const allocator = new CidrAllocator(config);
 * const allocations = allocator.generateAllocations();
 *
 * // Write all allocations
 * await writeAllocationsToCsv(allocations, './all-allocations.csv');
 *
 * // Write only AWS allocations
 * const awsOnly = filterAllocationsByProvider(allocations, 'aws');
 * await writeAllocationsToCsv(awsOnly, './aws-allocations.csv');
 * ```
 *
 * @packageDocumentation
 */

import { createObjectCsvWriter } from 'csv-writer';
import type { Allocation } from '../models/types';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';
import { IOError, ErrorCode } from '../utils/errors';

/**
 * Logger instance for CSV output operations.
 * @internal
 */
const logger = createLogger('CsvWriter');

/**
 * Writes CIDR allocations to a CSV file.
 *
 * @remarks
 * Creates the output directory if it doesn't exist. Allocations are sorted
 * by cloud provider, account name, region, availability zone, and subnet
 * role for consistent, predictable output.
 *
 * CSV columns:
 * | Column | Description |
 * |--------|-------------|
 * | Cloud Provider | aws, azure, or gcp |
 * | Account Name | Account identifier |
 * | VPC Name | VPC identifier (typically `{account}-vpc`) |
 * | Region Name | Cloud region |
 * | Availability Zone | AZ within the region |
 * | Region CIDR | CIDR allocated to the region |
 * | VPC CIDR | CIDR for the VPC |
 * | AZ CIDR | CIDR allocated to the AZ |
 * | Subnet CIDR | Final subnet CIDR |
 * | Subnet Role | Subnet type (public, private, etc.) |
 * | Usable IPs | Count of usable IP addresses |
 *
 * @param allocations - Array of allocation objects to write
 * @param outputPath - Path for the output CSV file (absolute or relative)
 *
 * @throws {@link IOError}
 * Thrown with `OUTPUT_WRITE_FAILED` if the file cannot be written.
 *
 * @example
 * ```typescript
 * import { writeAllocationsToCsv } from '@subnetter/core';
 *
 * await writeAllocationsToCsv(allocations, './output/allocations.csv');
 * ```
 *
 * @example
 * ```typescript
 * // Creates directory if needed
 * await writeAllocationsToCsv(allocations, './reports/2024/q1/allocations.csv');
 * ```
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

    // Sort allocations for consistent output
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

    // Transform to CSV-friendly format with readable column names
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

    // Define CSV header structure
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

    // Create CSV writer and write records
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header
    });

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
 * @remarks
 * Case-insensitive matching. Useful for generating provider-specific
 * outputs or analyzing allocations per cloud.
 *
 * @param allocations - Array of allocations to filter
 * @param provider - Cloud provider name ('aws', 'azure', 'gcp')
 * @returns Filtered array containing only allocations for the specified provider
 *
 * @example
 * ```typescript
 * import { filterAllocationsByProvider } from '@subnetter/core';
 *
 * const awsAllocations = filterAllocationsByProvider(allocations, 'aws');
 * const azureAllocations = filterAllocationsByProvider(allocations, 'Azure'); // case-insensitive
 *
 * console.log(`AWS: ${awsAllocations.length} subnets`);
 * console.log(`Azure: ${azureAllocations.length} subnets`);
 * ```
 *
 * @example
 * ```typescript
 * // Write separate files per provider
 * for (const provider of ['aws', 'azure', 'gcp']) {
 *   const filtered = filterAllocationsByProvider(allocations, provider);
 *   if (filtered.length > 0) {
 *     await writeAllocationsToCsv(filtered, `./output/${provider}.csv`);
 *   }
 * }
 * ```
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

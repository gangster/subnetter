import { SubnetTypesMap } from '../../models/types';

/**
 * Converts subnet types from the object map format to an array format for internal use.
 * 
 * @param subnetTypes Subnet types map (name to prefix length)
 * @returns Array of subnet type objects with name and prefixLength properties
 */
export function normalizeSubnetTypes(subnetTypes: SubnetTypesMap): Array<{name: string; prefixLength: number}> {
  // Convert map format to array format for internal use
  return Object.entries(subnetTypes).map(([name, prefixLength]) => ({
    name,
    prefixLength
  }));
} 
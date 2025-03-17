import { z } from 'zod';
import { RawConfig } from '../models/types';

/**
 * Regular expression for validating IPv4 CIDR notation.
 * Matches patterns like '192.168.1.0/24' or '10.0.0.0/8'.
 */
const ipv4CidrRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(3[0-2]|[1-2][0-9]|[0-9])$/;

/**
 * Schema for validating prefix lengths configuration.
 */
export const prefixLengthsSchema = z.object({
  account: z.number().int().min(1).max(32).optional(),
  region: z.number().int().min(1).max(32).optional(),
  az: z.number().int().min(1).max(32).optional()
}).optional();

/**
 * Schema for validating cloud-specific configuration.
 */
export const cloudConfigSchema = z.object({
  baseCidr: z.string().regex(ipv4CidrRegex, 'Invalid IPv4 CIDR format').optional(),
  regions: z.array(z.string().min(1))
});

/**
 * Schema for validating Account configuration.
 */
export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Account name cannot be empty'),
  // Only support the clouds property
  clouds: z.record(z.string(), cloudConfigSchema)
});

/**
 * Schema for subnet types.
 * Accepts object mapping subnet names to prefix lengths.
 */
export const subnetTypesSchema = z.record(
  z.string().min(1),
  z.number().int().min(1).max(32)
);

/**
 * Schema for validating the entire configuration.
 */
export const configSchema = z.object({
  baseCidr: z.string().regex(ipv4CidrRegex, 'Invalid IPv4 CIDR format'),
  prefixLengths: prefixLengthsSchema,
  // Make cloudProviders optional since we can infer from account configs
  cloudProviders: z.array(z.string().min(1)).optional(),
  accounts: z.array(accountSchema),
  subnetTypes: subnetTypesSchema
});

/**
 * Type definition for the configuration schema.
 */
export type ConfigSchema = z.infer<typeof configSchema> & RawConfig; 
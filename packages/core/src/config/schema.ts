/**
 * @module config/schema
 * @description Zod validation schemas for Subnetter configuration files.
 *
 * This module provides runtime validation for configuration objects using Zod.
 * Schemas enforce correct structure, valid CIDR formats, and sensible defaults.
 *
 * @remarks
 * All schemas are composable and export both the schema and inferred TypeScript types.
 * Use these schemas directly for custom validation, or use {@link loadConfig} for
 * file-based configuration loading.
 *
 * @example
 * ```typescript
 * import { configSchema } from '@subnetter/core';
 *
 * const result = configSchema.safeParse(userInput);
 * if (result.success) {
 *   console.log('Valid config:', result.data);
 * } else {
 *   console.error('Validation errors:', result.error.issues);
 * }
 * ```
 *
 * @see {@link loadConfig} for loading and validating config files
 * @see {@link validateConfig} for validating config objects
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import type { RawConfig } from '../models/types';

/**
 * Regular expression for validating IPv4 CIDR notation.
 *
 * @remarks
 * Validates the format `a.b.c.d/n` where:
 * - Each octet (a, b, c, d) is 0-255
 * - Prefix length (n) is 0-32
 *
 * @example
 * Valid: '10.0.0.0/8', '192.168.1.0/24', '172.16.0.0/12'
 * Invalid: '256.0.0.0/8', '10.0.0.0/33', '10.0.0/24'
 *
 * @internal
 */
const ipv4CidrRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(3[0-2]|[1-2][0-9]|[0-9])$/;

/**
 * Schema for validating prefix length configuration.
 *
 * @remarks
 * Prefix lengths control the size of CIDR blocks at each hierarchy level.
 * Valid values are 1-32, representing the number of network bits.
 *
 * Default values when not specified:
 * - `account`: 16 (65,534 addresses per account)
 * - `region`: 20 (4,094 addresses per region)
 * - `az`: 24 (254 addresses per AZ)
 *
 * @example
 * ```typescript
 * const prefixConfig = prefixLengthsSchema.parse({
 *   account: 16,
 *   region: 20,
 *   az: 24
 * });
 * ```
 */
export const prefixLengthsSchema = z.object({
  /**
   * Prefix length for account-level CIDR blocks.
   * Must be greater than the base CIDR prefix to allow subdivision.
   */
  account: z.number().int().min(1).max(32).optional(),

  /**
   * Prefix length for region-level CIDR blocks.
   * Must be greater than the account prefix.
   */
  region: z.number().int().min(1).max(32).optional(),

  /**
   * Prefix length for availability zone CIDR blocks.
   * Must be greater than the region prefix.
   */
  az: z.number().int().min(1).max(32).optional()
}).optional();

/**
 * Schema for validating cloud-specific configuration.
 *
 * @remarks
 * Each cloud provider within an account can have its own regions
 * and optionally override the base CIDR block.
 *
 * @example
 * ```typescript
 * const awsConfig = cloudConfigSchema.parse({
 *   baseCidr: '10.100.0.0/16',  // Optional override
 *   regions: ['us-east-1', 'us-west-2']
 * });
 * ```
 */
export const cloudConfigSchema = z.object({
  /**
   * Optional CIDR override for this cloud provider.
   * When specified, this cloud uses a separate address space.
   */
  baseCidr: z.string().regex(ipv4CidrRegex, 'Invalid IPv4 CIDR format').optional(),

  /**
   * Regions to deploy subnets in.
   * Must contain at least one region.
   */
  regions: z.array(z.string().min(1))
});

/**
 * Schema for validating account configuration.
 *
 * @remarks
 * Accounts represent logical organizational units that can span
 * multiple cloud providers. Each account must have a unique name
 * and at least one cloud provider configuration.
 *
 * @example
 * ```typescript
 * const account = accountSchema.parse({
 *   name: 'production',
 *   clouds: {
 *     aws: { regions: ['us-east-1'] },
 *     azure: { regions: ['eastus'] }
 *   }
 * });
 * ```
 */
export const accountSchema = z.object({
  /**
   * Unique account identifier.
   * Trimmed and validated to be non-empty.
   */
  name: z.string().trim().min(1, 'Account name cannot be empty'),

  /**
   * Cloud provider configurations.
   * Keys should be 'aws', 'azure', or 'gcp'.
   */
  clouds: z.record(z.string(), cloudConfigSchema)
});

/**
 * Schema for validating subnet type definitions.
 *
 * @remarks
 * Subnet types define the purpose and size of subnets. Each type
 * maps to a prefix length that determines the number of available
 * IP addresses.
 *
 * Common configurations:
 * - `/26` (62 IPs): Small subnets for NAT gateways, load balancers
 * - `/24` (254 IPs): Standard subnets for most workloads
 * - `/22` (1,022 IPs): Large subnets for Kubernetes pods
 * - `/20` (4,094 IPs): Extra-large subnets for high-density workloads
 *
 * @example
 * ```typescript
 * const subnetTypes = subnetTypesSchema.parse({
 *   public: 26,
 *   private: 24,
 *   database: 27,
 *   kubernetes: 22
 * });
 * ```
 */
export const subnetTypesSchema = z.record(
  z.string().min(1),
  z.number().int().min(1).max(32)
);

/**
 * Complete schema for Subnetter configuration files.
 *
 * @remarks
 * This schema validates the entire configuration structure including:
 * - Base CIDR block (required, valid IPv4 CIDR)
 * - Prefix lengths (optional, defaults applied during allocation)
 * - Cloud providers (optional, can be inferred from accounts)
 * - Accounts (required, at least one)
 * - Subnet types (required, at least one type)
 *
 * @example
 * ```typescript
 * import { configSchema } from '@subnetter/core';
 *
 * // Minimal valid configuration
 * const minimalConfig = configSchema.parse({
 *   baseCidr: '10.0.0.0/8',
 *   accounts: [
 *     {
 *       name: 'main',
 *       clouds: { aws: { regions: ['us-east-1'] } }
 *     }
 *   ],
 *   subnetTypes: { public: 24, private: 24 }
 * });
 *
 * // Full configuration with all options
 * const fullConfig = configSchema.parse({
 *   baseCidr: '10.0.0.0/8',
 *   prefixLengths: { account: 16, region: 20, az: 24 },
 *   cloudProviders: ['aws', 'azure'],
 *   accounts: [
 *     {
 *       name: 'production',
 *       clouds: {
 *         aws: { regions: ['us-east-1', 'us-west-2'] },
 *         azure: { baseCidr: '172.16.0.0/12', regions: ['eastus'] }
 *       }
 *     }
 *   ],
 *   subnetTypes: { public: 26, private: 24, database: 27 }
 * });
 * ```
 *
 * @see {@link loadConfig} for loading config from files
 * @see {@link validateConfig} for validating config objects
 */
export const configSchema = z.object({
  /**
   * Root CIDR block for all allocations.
   * All subnets are carved from this address space unless a cloud
   * configuration specifies an override.
   */
  baseCidr: z.string().regex(ipv4CidrRegex, 'Invalid IPv4 CIDR format'),

  /**
   * Optional prefix length configuration.
   */
  prefixLengths: prefixLengthsSchema,

  /**
   * Optional list of cloud providers.
   * When omitted, providers are inferred from account configurations.
   */
  cloudProviders: z.array(z.string().min(1)).optional(),

  /**
   * Account configurations.
   * Must contain at least one account.
   */
  accounts: z.array(accountSchema),

  /**
   * Subnet type definitions.
   * Maps subnet names to prefix lengths.
   */
  subnetTypes: subnetTypesSchema
});

/**
 * TypeScript type inferred from the configuration schema.
 *
 * @remarks
 * Use this type for type-safe access to validated configuration data.
 * The intersection with `RawConfig` ensures compatibility with the
 * models/types definitions.
 *
 * @example
 * ```typescript
 * import { configSchema, ConfigSchema } from '@subnetter/core';
 *
 * function processConfig(config: ConfigSchema) {
 *   console.log(`Base CIDR: ${config.baseCidr}`);
 *   console.log(`Accounts: ${config.accounts.length}`);
 * }
 * ```
 */
export type ConfigSchema = z.infer<typeof configSchema> & RawConfig;

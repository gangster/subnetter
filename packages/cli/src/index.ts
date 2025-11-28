#!/usr/bin/env node
/**
 * @module @subnetter/cli
 * @description Command-line interface for Subnetter CIDR allocation.
 *
 * Provides a comprehensive CLI for generating, validating, and exporting
 * IPv4 subnet allocations for multi-cloud infrastructure. Built on
 * Commander.js with colored output, configurable logging, and detailed
 * error handling.
 *
 * ## Available Commands
 *
 * | Command | Description |
 * |---------|-------------|
 * | `generate` | Generate allocations from config and write to CSV |
 * | `validate` | Validate a configuration file without generating |
 * | `analyze` | Display configuration statistics |
 * | `validate-allocations` | Check an existing CSV for CIDR overlaps |
 * | `netbox-export` | Export allocations to NetBox IPAM |
 *
 * ## Global Options
 *
 * All commands support these options:
 * - `-v, --verbose`: Enable debug-level logging
 * - `-l, --log-level <level>`: Set log level (silent, error, warn, info, debug, trace)
 * - `--no-color`: Disable colored output
 * - `--timestamps`: Include timestamps in log output
 *
 * @example
 * ```bash
 * # Generate allocations
 * subnetter generate -c config.json -o allocations.csv
 *
 * # Validate configuration
 * subnetter validate -c config.json --verbose
 *
 * # Analyze configuration
 * subnetter analyze -c config.json
 *
 * # Validate existing allocations
 * subnetter validate-allocations -f allocations.csv
 *
 * # Export to NetBox
 * subnetter netbox-export -c config.json --netbox-url https://netbox.example.com --dry-run
 * ```
 *
 * @see {@link https://github.com/gangster/subnetter | GitHub Repository}
 * @see {@link @subnetter/core | Core Library Documentation}
 *
 * @packageDocumentation
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import {
  loadConfig,
  CidrAllocator,
  writeAllocationsToCsv,
  filterAllocationsByProvider,
  validateNoOverlappingCidrs,
  Account,
  CloudConfig,
  createLogger,
  configureLogger,
  LogLevel,
  parseLogLevel,
  SubnetterError,
  ErrorCode
} from '@subnetter/core';
import {
  NetBoxClient,
  NetBoxExporter,
  NetBoxApiError
} from '@subnetter/netbox';

// ─────────────────────────────────────────────────────────────────────────────
// Package Metadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Package.json contents for version information.
 * @internal
 */
const packageJson = require('../package.json');

// ─────────────────────────────────────────────────────────────────────────────
// Logger Instances
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logger for general CLI operations.
 * @internal
 */
const cliLogger = createLogger('CLI');

/**
 * Logger for configuration loading and validation.
 * @internal
 */
const configLogger = createLogger('Config');

/**
 * Logger for allocation operations.
 * @internal
 */
const allocatorLogger = createLogger('Allocator');

/**
 * Logger for output file operations.
 * @internal
 */
const outputLogger = createLogger('Output');

// ─────────────────────────────────────────────────────────────────────────────
// CLI Program Setup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Commander.js program instance.
 *
 * @remarks
 * The CLI is built using Commander.js and provides a consistent interface
 * for all Subnetter operations. Each command follows a similar pattern:
 * 1. Configure logging based on options
 * 2. Load/validate configuration
 * 3. Perform the requested operation
 * 4. Handle errors with helpful messages
 *
 * @internal
 */
const program = new Command();

// Configure program metadata
program
  .name('subnetter')
  .description('IPv4 CIDR allocation tool for cloud infrastructure')
  .version(packageJson.version);

// ─────────────────────────────────────────────────────────────────────────────
// Generate Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate command: Creates IPv4 allocations from configuration.
 *
 * @remarks
 * This is the primary command for generating subnet allocations. It:
 * 1. Loads and validates the configuration file
 * 2. Optionally overrides the base CIDR
 * 3. Generates allocations using the CidrAllocator
 * 4. Optionally filters by cloud provider
 * 5. Validates for CIDR overlaps (warning only)
 * 6. Writes results to CSV
 *
 * @example
 * ```bash
 * # Basic usage
 * subnetter generate -c config.json -o allocations.csv
 *
 * # With provider filter
 * subnetter generate -c config.json -p aws -o aws-only.csv
 *
 * # With base CIDR override
 * subnetter generate -c config.json -b 172.16.0.0/12
 *
 * # Verbose output
 * subnetter generate -c config.json -v
 * ```
 */
program
  .command('generate')
  .description('Generate IPv4 allocations for accounts, regions, and subnets')
  .requiredOption('-c, --config <path>', 'Path to configuration file (JSON or YAML format)')
  .option('-o, --output <path>', 'Path to output CSV file', 'allocations.csv')
  .option('-p, --provider <n>', 'Filter results by cloud provider')
  .option('-b, --base-cidr <cidr>', 'Override base IPv4 CIDR block')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-l, --log-level <level>', 'Set log level (silent, error, warn, info, debug, trace)', 'info')
  .option('--no-color', 'Disable colored output')
  .option('--timestamps', 'Include timestamps in log output')
  .action(async (options) => {
    try {
      // Configure logging
      configureLogger({
        level: options.verbose ? LogLevel.DEBUG : parseLogLevel(options.logLevel),
        useColor: options.color,
        timestamps: options.timestamps
      });

      cliLogger.debug('Command options:', options);

      // Load configuration
      configLogger.debug(`Loading config from: ${options.config}`);
      const config = await loadConfig(options.config);
      configLogger.debug('Config loaded successfully');

      // Apply base CIDR override if specified
      if (options.baseCidr) {
        configLogger.debug(`Overriding base CIDR with: ${options.baseCidr}`);
        config.baseCidr = options.baseCidr;
      }

      // Create allocator and generate allocations
      allocatorLogger.debug('Creating allocator instance');
      const allocator = new CidrAllocator(config);
      allocatorLogger.debug('Allocator created successfully');

      allocatorLogger.debug('Generating CIDR allocations');
      let allocations = allocator.generateAllocations();
      allocatorLogger.debug(`Generated ${allocations.length} allocations`);

      // Apply provider filter if specified
      if (options.provider) {
        allocatorLogger.debug(`Filtering by provider: ${options.provider}`);
        allocations = filterAllocationsByProvider(allocations, options.provider);
        allocatorLogger.debug(`Filtered to ${allocations.length} allocations`);
      }

      // Validate for overlaps (non-fatal)
      cliLogger.debug('Validating allocations for CIDR overlaps');
      const validationResult = validateNoOverlappingCidrs(allocations, false);

      if (!validationResult.valid) {
        cliLogger.warn(`⚠️ Warning: Found ${validationResult.overlaps.length} CIDR overlaps in the allocations.`);

        const maxOverlapsToShow = 5;
        validationResult.overlaps.slice(0, maxOverlapsToShow).forEach((overlap, index) => {
          cliLogger.warn(`  Overlap ${index + 1}: ${overlap.cidr1} (${overlap.allocation1.accountName}, ${overlap.allocation1.regionName}) ↔ ${overlap.cidr2} (${overlap.allocation2.accountName}, ${overlap.allocation2.regionName})`);
        });

        if (validationResult.overlaps.length > maxOverlapsToShow) {
          cliLogger.warn(`  ... and ${validationResult.overlaps.length - maxOverlapsToShow} more overlaps`);
        }

        cliLogger.warn('⚠️ Proceeding with allocation output despite overlaps.');
      } else {
        cliLogger.info('✅ No CIDR overlaps detected in allocations.');
      }

      // Write to CSV
      const outputPath = options.output;
      outputLogger.debug(`Writing allocations to CSV: ${outputPath}`);
      await writeAllocationsToCsv(allocations, outputPath);
      outputLogger.debug('CSV written successfully');

      cliLogger.info(`✅ Successfully generated ${allocations.length} subnet allocations.`);
      cliLogger.info(`📝 Results written to ${path.resolve(outputPath)}`);
    } catch (error: unknown) {
      handleError(error, options);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Validate Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate command: Validates configuration without generating allocations.
 *
 * @remarks
 * Performs full configuration validation including:
 * - File format (JSON/YAML)
 * - Schema validation
 * - CIDR format validation
 * - CIDR overlap detection in config
 *
 * Optionally displays configuration statistics when verbose mode is enabled.
 *
 * @example
 * ```bash
 * # Basic validation
 * subnetter validate -c config.json
 *
 * # With detailed output
 * subnetter validate -c config.json --verbose
 * ```
 */
program
  .command('validate')
  .description('Validate configuration file without generating allocations')
  .requiredOption('-c, --config <path>', 'Path to configuration file (JSON or YAML format)')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-l, --log-level <level>', 'Set log level (silent, error, warn, info, debug, trace)', 'info')
  .option('--no-color', 'Disable colored output')
  .option('--timestamps', 'Include timestamps in log output')
  .action(async (options) => {
    try {
      // Configure logging
      configureLogger({
        level: options.verbose ? LogLevel.DEBUG : parseLogLevel(options.logLevel),
        useColor: options.color,
        timestamps: options.timestamps
      });

      // Check if file exists
      if (!fs.existsSync(options.config)) {
        throw new SubnetterError(
          `Configuration file not found: ${options.config}`,
          ErrorCode.CONFIG_FILE_NOT_FOUND,
          { configPath: options.config }
        );
      }

      // Load and validate configuration
      configLogger.debug(`Loading and validating config from: ${options.config}`);
      const config = await loadConfig(options.config);
      configLogger.debug('Config validation completed');

      cliLogger.info('✅ Configuration is valid!');

      // Print detailed information in verbose mode
      if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
        configLogger.info('📊 Configuration Details:');
        configLogger.info(`Base CIDR: ${config.baseCidr}`);
        configLogger.info(`Accounts: ${config.accounts.length}`);

        const subnetTypeNames = Object.keys(config.subnetTypes).join(', ');
        configLogger.info(`Subnet Types: ${subnetTypeNames}`);

        configLogger.debug('Subnet Type Details:');
        Object.entries(config.subnetTypes).forEach(([name, prefixLength]) => {
          configLogger.debug(`  - ${name}: /${prefixLength}`);
        });

        if (config.prefixLengths) {
          configLogger.debug('Prefix Lengths:');
          Object.entries(config.prefixLengths).forEach(([level, value]) => {
            configLogger.debug(`  - ${level}: ${value}`);
          });
        }
      }

      // Calculate and display statistics
      const stats = calculateConfigStats(config);
      cliLogger.info(`Total Subnets: ${stats.totalSubnets} (${stats.totalRegions} regions × 3 AZs × ${Object.keys(config.subnetTypes).length} subnet types)`);

      if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
        configLogger.debug('Provider Statistics:');
        Object.entries(stats.accountsByProvider).forEach(([provider, count]) => {
          configLogger.debug(`  - ${provider}: ${count} accounts, ${stats.regionsByProvider[provider]} regions`);
        });
      }
    } catch (error: unknown) {
      handleError(error, options);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Analyze Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze command: Displays configuration statistics.
 *
 * @remarks
 * Provides a summary of the configuration including:
 * - Base CIDR and cloud providers
 * - Number of accounts, regions, and estimated subnets
 * - Provider-specific breakdowns (in verbose mode)
 *
 * @example
 * ```bash
 * subnetter analyze -c config.json
 * subnetter analyze -c config.json -v
 * ```
 */
program
  .command('analyze')
  .description('Analyze a configuration file for statistics')
  .requiredOption('-c, --config <path>', 'Path to configuration file (JSON or YAML format)')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-l, --log-level <level>', 'Set log level (silent, error, warn, info, debug, trace)', 'info')
  .option('--no-color', 'Disable colored output')
  .option('--timestamps', 'Include timestamps in log output')
  .action(async (options) => {
    try {
      // Configure logging
      configureLogger({
        level: options.verbose ? LogLevel.DEBUG : parseLogLevel(options.logLevel),
        useColor: options.color,
        timestamps: options.timestamps
      });

      // Load configuration
      configLogger.debug(`Loading config from: ${options.config}`);
      const config = await loadConfig(options.config);
      configLogger.debug('Config loaded successfully');

      // Display analysis
      cliLogger.info(`Configuration Analysis for: ${path.resolve(options.config)}`);
      cliLogger.info(`Base CIDR: ${config.baseCidr}`);
      cliLogger.info(`Cloud Providers: ${config.cloudProviders.join(', ')}`);
      cliLogger.info(`Accounts: ${config.accounts.length}`);
      cliLogger.info(`Subnet Types: ${Object.keys(config.subnetTypes).length}`);

      const stats = calculateConfigStats(config);
      cliLogger.info(`Total Subnets: ${stats.totalSubnets} (${stats.totalRegions} regions × 3 AZs × ${Object.keys(config.subnetTypes).length} subnet types)`);

      if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
        configLogger.debug('Provider Statistics:');
        Object.entries(stats.accountsByProvider).forEach(([provider, count]) => {
          configLogger.debug(`  - ${provider}: ${count} accounts, ${stats.regionsByProvider[provider]} regions`);
        });
      }
    } catch (error: unknown) {
      handleError(error, options);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Validate Allocations Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate-allocations command: Checks existing CSV for CIDR overlaps.
 *
 * @remarks
 * Reads an existing allocations CSV file and validates that no subnet
 * CIDRs overlap. Useful for:
 * - Validating manually edited allocations
 * - Checking merged allocation files
 * - CI/CD pipeline validation
 *
 * Exits with code 1 if overlaps are detected.
 *
 * @example
 * ```bash
 * subnetter validate-allocations -f allocations.csv
 * subnetter validate-allocations -f allocations.csv --verbose
 * ```
 */
program
  .command('validate-allocations')
  .description('Validate an existing allocations CSV file for CIDR overlaps')
  .requiredOption('-f, --file <path>', 'Path to allocations CSV file to validate')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-l, --log-level <level>', 'Set log level (silent, error, warn, info, debug, trace)', 'info')
  .option('--no-color', 'Disable colored output')
  .option('--timestamps', 'Include timestamps in log output')
  .action(async (options) => {
    try {
      // Configure logging
      configureLogger({
        level: options.verbose ? LogLevel.DEBUG : parseLogLevel(options.logLevel),
        useColor: options.color,
        timestamps: options.timestamps
      });

      const filePath = options.file;
      cliLogger.debug(`Validating allocations file: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new SubnetterError(
          `Allocations file not found: ${filePath}`,
          ErrorCode.CONFIG_FILE_NOT_FOUND,
          { filePath }
        );
      }

      // Parse CSV file
      const allocations = parseAllocationsCSV(filePath);
      cliLogger.debug(`Found ${allocations.length} allocation entries in the file`);

      // Validate for overlaps
      cliLogger.debug(`Validating ${allocations.length} allocations for CIDR overlaps`);
      const validationResult = validateNoOverlappingCidrs(allocations, false);

      if (!validationResult.valid) {
        cliLogger.warn(`⚠️ Found ${validationResult.overlaps.length} CIDR overlaps in the allocations.`);

        const maxOverlapsToShow = 10;
        validationResult.overlaps.slice(0, maxOverlapsToShow).forEach((overlap, index) => {
          cliLogger.warn(`  Overlap ${index + 1}: ${overlap.cidr1} (${overlap.allocation1.accountName}, ${overlap.allocation1.regionName}) ↔ ${overlap.cidr2} (${overlap.allocation2.accountName}, ${overlap.allocation2.regionName})`);
        });

        if (validationResult.overlaps.length > maxOverlapsToShow) {
          cliLogger.warn(`  ... and ${validationResult.overlaps.length - maxOverlapsToShow} more overlaps`);
        }

        process.exit(1);
      } else {
        cliLogger.info(`✅ Success! No CIDR overlaps detected in ${allocations.length} allocations.`);
      }
    } catch (error: unknown) {
      handleError(error, options);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// NetBox Export Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NetBox-export command: Exports allocations to NetBox IPAM.
 *
 * @remarks
 * Synchronizes generated allocations with a NetBox instance. Supports:
 * - Dry-run mode for previewing changes
 * - Pruning of orphaned prefixes
 * - Configurable prefix status
 * - Provider filtering
 *
 * Requires a NetBox API token via `--netbox-token` or `NETBOX_TOKEN` env var.
 *
 * @example
 * ```bash
 * # Dry run to preview changes
 * subnetter netbox-export -c config.json --netbox-url https://netbox.example.com --dry-run
 *
 * # Apply changes
 * subnetter netbox-export -c config.json --netbox-url https://netbox.example.com
 *
 * # With pruning of orphaned prefixes
 * subnetter netbox-export -c config.json --netbox-url https://netbox.example.com --prune
 *
 * # Filter to specific provider
 * subnetter netbox-export -c config.json --netbox-url https://netbox.example.com -p aws
 * ```
 */
program
  .command('netbox-export')
  .description('Export allocations to NetBox IPAM')
  .requiredOption('-c, --config <path>', 'Path to configuration file (JSON or YAML format)')
  .requiredOption('--netbox-url <url>', 'NetBox API URL (e.g., https://netbox.example.com)')
  .option('--netbox-token <token>', 'NetBox API token (or set NETBOX_TOKEN env var)')
  .option('--dry-run', 'Show what would be done without making changes', false)
  .option('--prune', 'Delete prefixes in NetBox not in allocations', false)
  .option('--status <status>', 'Status for new prefixes (container, active, reserved, deprecated)', 'reserved')
  .option('-p, --provider <n>', 'Filter results by cloud provider')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-l, --log-level <level>', 'Set log level (silent, error, warn, info, debug, trace)', 'info')
  .option('--no-color', 'Disable colored output')
  .option('--timestamps', 'Include timestamps in log output')
  .action(async (options) => {
    try {
      // Configure logging
      configureLogger({
        level: options.verbose ? LogLevel.DEBUG : parseLogLevel(options.logLevel),
        useColor: options.color,
        timestamps: options.timestamps
      });

      cliLogger.debug('Command options:', options);

      // Get NetBox token
      const netboxToken = options.netboxToken || process.env.NETBOX_TOKEN;
      if (!netboxToken) {
        throw new SubnetterError(
          'NetBox API token is required. Use --netbox-token or set NETBOX_TOKEN environment variable.',
          ErrorCode.MISSING_REQUIRED_FIELD,
          { option: 'netbox-token' }
        );
      }

      // Load configuration and generate allocations
      configLogger.debug(`Loading config from: ${options.config}`);
      const config = await loadConfig(options.config);
      configLogger.debug('Config loaded successfully');

      allocatorLogger.debug('Creating allocator instance');
      const allocator = new CidrAllocator(config);
      allocatorLogger.debug('Allocator created successfully');

      allocatorLogger.debug('Generating CIDR allocations');
      let allocations = allocator.generateAllocations();
      allocatorLogger.debug(`Generated ${allocations.length} allocations`);

      // Apply provider filter if specified
      if (options.provider) {
        allocatorLogger.debug(`Filtering by provider: ${options.provider}`);
        allocations = filterAllocationsByProvider(allocations, options.provider);
        allocatorLogger.debug(`Filtered to ${allocations.length} allocations`);
      }

      // Connect to NetBox
      cliLogger.debug(`Connecting to NetBox at: ${options.netboxUrl}`);
      const client = new NetBoxClient({
        url: options.netboxUrl,
        token: netboxToken,
      });

      const connected = await client.testConnection();
      if (!connected) {
        throw new SubnetterError(
          `Unable to connect to NetBox at ${options.netboxUrl}`,
          ErrorCode.INVALID_OPERATION,
          { url: options.netboxUrl }
        );
      }
      cliLogger.debug('NetBox connection successful');

      // Run export
      const exporter = new NetBoxExporter(client);

      if (options.dryRun) {
        cliLogger.info('🔍 Running in dry-run mode (no changes will be made)');
      }

      const result = await exporter.export(allocations, {
        dryRun: options.dryRun,
        prune: options.prune,
        status: options.status,
        createMissing: true,
        baseCidr: config.baseCidr,
      });

      // Display results
      displayNetBoxResults(result, options);

      if (!result.success) {
        process.exit(1);
      }
    } catch (error: unknown) {
      if (error instanceof NetBoxApiError) {
        cliLogger.error(`❌ NetBox API Error: ${error.message} (HTTP ${error.statusCode})`);
        if (error.response && options.verbose) {
          cliLogger.debug(`Response: ${JSON.stringify(error.response)}`);
        }
      } else {
        handleError(error, options);
      }
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration statistics result.
 * @internal
 */
interface ConfigStats {
  totalRegions: number;
  totalSubnets: number;
  accountsByProvider: Record<string, number>;
  regionsByProvider: Record<string, number>;
}

/**
 * Calculates statistics from a configuration.
 *
 * @param config - Loaded configuration object
 * @returns Statistics including region counts and provider breakdowns
 * @internal
 */
function calculateConfigStats(config: { accounts: Account[]; subnetTypes: Record<string, number> }): ConfigStats {
  let totalRegions = 0;
  const accountsByProvider: Record<string, number> = {};
  const regionsByProvider: Record<string, number> = {};

  config.accounts.forEach((account: Account) => {
    if (account.clouds) {
      Object.entries(account.clouds).forEach(([provider, cloudConfig]: [string, CloudConfig]) => {
        if (cloudConfig && Array.isArray(cloudConfig.regions)) {
          totalRegions += cloudConfig.regions.length;
          accountsByProvider[provider] = (accountsByProvider[provider] || 0) + 1;
          regionsByProvider[provider] = (regionsByProvider[provider] || 0) + cloudConfig.regions.length;
        }
      });
    }
  });

  const totalSubnets = totalRegions * 3 * Object.keys(config.subnetTypes).length;

  return { totalRegions, totalSubnets, accountsByProvider, regionsByProvider };
}

/**
 * Parses an allocations CSV file into Allocation objects.
 *
 * @param filePath - Path to the CSV file
 * @returns Array of parsed allocation objects
 * @internal
 */
function parseAllocationsCSV(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');

  // Skip header row
  const dataLines = lines.slice(1).filter(line => line.trim().length > 0);

  return dataLines.map(line => {
    const fields = line.split(',');
    return {
      accountName: fields[0] || '',
      vpcName: fields[1] || '',
      cloudProvider: fields[2] || '',
      regionName: fields[3] || '',
      availabilityZone: fields[4] || '',
      regionCidr: fields[5] || '',
      vpcCidr: fields[6] || '',
      azCidr: fields[7] || '',
      subnetCidr: fields[8] || '',
      subnetRole: fields[9] || '',
      usableIps: parseInt(fields[10] || '0', 10)
    };
  });
}

/**
 * Displays NetBox export results.
 *
 * @param result - Export result object
 * @param options - CLI options for verbosity control
 * @internal
 */
function displayNetBoxResults(
  result: {
    success: boolean;
    summary: { created: number; updated: number; deleted: number; skipped: number; errors: number };
    errors: Array<{ identifier: string; error: string }>;
    changes: Array<{ operation: string; objectType: string; identifier: string; reason?: string }>;
  },
  options: { verbose?: boolean; logLevel?: string; dryRun?: boolean }
): void {
  cliLogger.info('');
  cliLogger.info('📊 Export Summary:');
  cliLogger.info(`   Created: ${result.summary.created}`);
  cliLogger.info(`   Updated: ${result.summary.updated}`);
  cliLogger.info(`   Deleted: ${result.summary.deleted}`);
  cliLogger.info(`   Skipped: ${result.summary.skipped}`);

  if (result.errors.length > 0) {
    cliLogger.warn(`   Errors: ${result.summary.errors}`);
    result.errors.forEach((err) => {
      cliLogger.warn(`     - ${err.identifier}: ${err.error}`);
    });
  }

  // Show detailed changes in verbose mode
  if (options.verbose || parseLogLevel(options.logLevel || 'info') >= LogLevel.DEBUG) {
    cliLogger.debug('');
    cliLogger.debug('Detailed Changes:');
    const icons: Record<string, string> = {
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      skip: '⏭️',
    };
    result.changes.forEach((change) => {
      const icon = icons[change.operation] || '❓';
      cliLogger.debug(`  ${icon} ${change.operation.toUpperCase()} ${change.objectType}: ${change.identifier}`);
      if (change.reason) {
        cliLogger.debug(`     Reason: ${change.reason}`);
      }
    });
  }

  if (result.success) {
    if (options.dryRun) {
      cliLogger.info('');
      cliLogger.info('✅ Dry run complete. Run without --dry-run to apply changes.');
    } else {
      cliLogger.info('');
      cliLogger.info('✅ Export to NetBox completed successfully!');
    }
  } else {
    cliLogger.warn('');
    cliLogger.warn('⚠️ Export completed with errors. See above for details.');
  }
}

/**
 * Handles errors with appropriate logging and help text.
 *
 * @param error - The error to handle
 * @param options - CLI options for verbosity control
 * @internal
 */
function handleError(error: unknown, options: { verbose?: boolean; logLevel?: string }): void {
  if (error instanceof SubnetterError) {
    const errorCode = error.code ? `[${error.code}] ` : '';
    cliLogger.error(`❌ Error: ${errorCode}${error.message}`);

    // Display context in verbose mode
    if (options.verbose || parseLogLevel(options.logLevel || 'info') >= LogLevel.DEBUG) {
      const contextStr = error.getContextString();
      if (contextStr && contextStr !== 'No additional context available.') {
        cliLogger.debug(`Context: ${contextStr}`);
      }
    }

    // Always show help text
    const helpText = error.getHelpText();
    if (helpText && helpText !== 'No specific help available for this error.') {
      cliLogger.info(`💡 Help: ${helpText}`);
    }

    // Stack trace in verbose mode
    if (options.verbose || parseLogLevel(options.logLevel || 'info') >= LogLevel.DEBUG) {
      if (error.stack) {
        cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
      }
    }
  } else {
    cliLogger.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    if (error instanceof Error && error.stack &&
        (options.verbose || parseLogLevel(options.logLevel || 'info') >= LogLevel.DEBUG)) {
      cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Program Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse command-line arguments and execute the appropriate command.
 */
program.parse();

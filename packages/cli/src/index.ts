#!/usr/bin/env node

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

// Package info
const packageJson = require('../package.json');

// Create the logger instances
const cliLogger = createLogger('CLI');
const configLogger = createLogger('Config');
const allocatorLogger = createLogger('Allocator');
const outputLogger = createLogger('Output');

// Create the CLI program
const program = new Command();

// Set up program metadata
program
  .name('subnetter')
  .description('IPv4 CIDR allocation tool for cloud infrastructure')
  .version(packageJson.version);

// Register the generate command
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
      // Configure the logger based on the options
      configureLogger({
        level: options.verbose ? LogLevel.DEBUG : parseLogLevel(options.logLevel),
        useColor: options.color,
        timestamps: options.timestamps
      });
      
      cliLogger.debug('Command options:', options);
      
      // Load the configuration
      configLogger.debug(`Loading config from: ${options.config}`);
      const config = await loadConfig(options.config);
      configLogger.debug('Config loaded successfully');

      // Apply base CIDR override if specified
      if (options.baseCidr) {
        configLogger.debug(`Overriding base CIDR with: ${options.baseCidr}`);
        config.baseCidr = options.baseCidr;
      }

      // Create an allocator
      allocatorLogger.debug('Creating allocator instance');
      const allocator = new CidrAllocator(config);
      allocatorLogger.debug('Allocator created successfully');

      // Generate allocations
      allocatorLogger.debug('Generating CIDR allocations');
      let allocations = allocator.generateAllocations();
      allocatorLogger.debug(`Generated ${allocations.length} allocations`);

      // Apply provider filter if specified
      if (options.provider) {
        allocatorLogger.debug(`Filtering by provider: ${options.provider}`);
        allocations = filterAllocationsByProvider(allocations, options.provider);
        allocatorLogger.debug(`Filtered to ${allocations.length} allocations`);
      }

      // Validate allocations for CIDR overlaps
      cliLogger.debug('Validating allocations for CIDR overlaps');
      const validationResult = validateNoOverlappingCidrs(allocations, false);
      
      if (!validationResult.valid) {
        cliLogger.warn(`⚠️ Warning: Found ${validationResult.overlaps.length} CIDR overlaps in the allocations.`);
        
        // Log the first few overlaps
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
      if (error instanceof SubnetterError) {
        const errorCode = error.code ? `[${error.code}] ` : '';
        cliLogger.error(`❌ Error: ${errorCode}${error.message}`);
        
        // Display context information for debug level and above
        if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
          if (error.getContextString()) {
            cliLogger.debug(`Context: ${error.getContextString()}`);
          }
        }
        
        // Always show help text for users
        const helpText = error.getHelpText();
        if (helpText) {
          cliLogger.info(`💡 Help: ${helpText}`);
        }
        
        // Only log the stack trace at debug level and above
        if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
          if (error.stack) {
            cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
          }
        }
      } else {
        cliLogger.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (error instanceof Error && error.stack && 
            (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG)) {
          cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
        }
      }
      
      process.exit(1);
    }
  });

// Register the validate command
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
      // Configure the logger based on the options
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
      
      // Load and validate the configuration
      configLogger.debug(`Loading and validating config from: ${options.config}`);
      const config = await loadConfig(options.config);
      configLogger.debug('Config validation completed');
      
      // Additional validation is already done by loadConfig
      cliLogger.info('✅ Configuration is valid!');
      
      // Print detailed configuration information
      if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
        configLogger.info('📊 Configuration Details:');
        configLogger.info(`Base CIDR: ${config.baseCidr}`);
        configLogger.info(`Accounts: ${config.accounts.length}`);
        
        // Display subnet type names
        const subnetTypeNames = Object.keys(config.subnetTypes).join(', ');
        configLogger.info(`Subnet Types: ${subnetTypeNames}`);
        
        // More detailed subnet type information
        configLogger.debug('Subnet Type Details:');
        Object.entries(config.subnetTypes).forEach(([name, prefixLength]) => {
          configLogger.debug(`  - ${name}: /${prefixLength}`);
        });
        
        // Prefix lengths if specified
        if (config.prefixLengths) {
          configLogger.debug('Prefix Lengths:');
          Object.entries(config.prefixLengths).forEach(([level, value]) => {
            configLogger.debug(`  - ${level}: ${value}`);
          });
        }
      }
      
      // Calculate total subnets that will be created
      let totalRegions = 0;
      let accountsByProvider: Record<string, number> = {};
      let regionsByProvider: Record<string, number> = {};
      
      config.accounts.forEach((account: Account) => {
        // Only handle accounts with clouds
        if (account.clouds) {
          // Process cloud-specific configurations
          allocatorLogger.debug(`Account ${account.name} has cloud-specific configurations`);
          Object.entries(account.clouds).forEach(([provider, cloudConfig]: [string, CloudConfig]) => {
            if (cloudConfig && Array.isArray(cloudConfig.regions)) {
              totalRegions += cloudConfig.regions.length;
              
              // Track statistics by provider
              accountsByProvider[provider] = (accountsByProvider[provider] || 0) + 1;
              regionsByProvider[provider] = (regionsByProvider[provider] || 0) + cloudConfig.regions.length;
            }
          });
        }
      });
      
      const totalSubnets = totalRegions * 3 * Object.keys(config.subnetTypes).length;
      cliLogger.info(`Total Subnets: ${totalSubnets} (${totalRegions} regions × 3 AZs × ${Object.keys(config.subnetTypes).length} subnet types)`);
      
      // Additional provider breakdowns for debug level
      if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
        configLogger.debug('Provider Statistics:');
        Object.entries(accountsByProvider).forEach(([provider, count]) => {
          configLogger.debug(`  - ${provider}: ${count} accounts, ${regionsByProvider[provider]} regions`);
        });
      }
    } catch (error: unknown) {
      if (error instanceof SubnetterError) {
        const errorCode = error.code ? `[${error.code}] ` : '';
        cliLogger.error(`❌ Error: ${errorCode}${error.message}`);
        
        // Display context information for debug level and above
        if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
          if (error.getContextString()) {
            cliLogger.debug(`Context: ${error.getContextString()}`);
          }
        }
        
        // Always show help text for users
        const helpText = error.getHelpText();
        if (helpText) {
          cliLogger.info(`💡 Help: ${helpText}`);
        }
        
        // Only log the stack trace at debug level and above
        if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
          if (error.stack) {
            cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
          }
        }
      } else {
        cliLogger.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (error instanceof Error && error.stack && 
            (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG)) {
          cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
        }
      }
      
      process.exit(1);
    }
  });

// Register the analyze command
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
      // Configure the logger based on the options
      configureLogger({
        level: options.verbose ? LogLevel.DEBUG : parseLogLevel(options.logLevel),
        useColor: options.color,
        timestamps: options.timestamps
      });
      
      // Load the configuration
      configLogger.debug(`Loading config from: ${options.config}`);
      const config = await loadConfig(options.config);
      configLogger.debug('Config loaded successfully');
      
      // Analyze the configuration
      cliLogger.info(`Configuration Analysis for: ${path.resolve(options.config)}`);
      cliLogger.info(`Base CIDR: ${config.baseCidr}`);
      cliLogger.info(`Cloud Providers: ${config.cloudProviders.join(', ')}`);
      cliLogger.info(`Accounts: ${config.accounts.length}`);
      cliLogger.info(`Subnet Types: ${Object.keys(config.subnetTypes).length}`);
      
      const accountsByProvider: Record<string, number> = {};
      const regionsByProvider: Record<string, number> = {};
      let totalRegions = 0;
      
      config.accounts.forEach((account: Account) => {
        // Only handle accounts with clouds
        if (account.clouds) {
          // Process cloud-specific configurations
          allocatorLogger.debug(`Account ${account.name} has cloud-specific configurations`);
          Object.entries(account.clouds).forEach(([provider, cloudConfig]: [string, CloudConfig]) => {
            if (cloudConfig && Array.isArray(cloudConfig.regions)) {
              totalRegions += cloudConfig.regions.length;
              
              // Track statistics by provider
              accountsByProvider[provider] = (accountsByProvider[provider] || 0) + 1;
              regionsByProvider[provider] = (regionsByProvider[provider] || 0) + cloudConfig.regions.length;
            }
          });
        }
      });
      
      const totalSubnets = totalRegions * 3 * Object.keys(config.subnetTypes).length;
      cliLogger.info(`Total Subnets: ${totalSubnets} (${totalRegions} regions × 3 AZs × ${Object.keys(config.subnetTypes).length} subnet types)`);
      
      // Additional provider breakdowns for debug level
      if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
        configLogger.debug('Provider Statistics:');
        Object.entries(accountsByProvider).forEach(([provider, count]) => {
          configLogger.debug(`  - ${provider}: ${count} accounts, ${regionsByProvider[provider]} regions`);
        });
      }
    } catch (error: unknown) {
      if (error instanceof SubnetterError) {
        const errorCode = error.code ? `[${error.code}] ` : '';
        cliLogger.error(`❌ Error: ${errorCode}${error.message}`);
        
        // Display context information for debug level and above
        if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
          if (error.getContextString()) {
            cliLogger.debug(`Context: ${error.getContextString()}`);
          }
        }
        
        // Always show help text for users
        const helpText = error.getHelpText();
        if (helpText) {
          cliLogger.info(`💡 Help: ${helpText}`);
        }
        
        // Only log the stack trace at debug level and above
        if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
          if (error.stack) {
            cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
          }
        }
      } else {
        cliLogger.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (error instanceof Error && error.stack && 
            (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG)) {
          cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
        }
      }
      
      process.exit(1);
    }
  });

// Register the validate-allocations command
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
      // Configure the logger based on the options
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
      
      // Read the CSV file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      // Skip header row
      const dataLines = lines.slice(1).filter(line => line.trim().length > 0);
      
      cliLogger.debug(`Found ${dataLines.length} allocation entries in the file`);
      
      // Parse the CSV data into Allocation objects
      const allocations = dataLines.map(line => {
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
      
      // Validate for CIDR overlaps
      cliLogger.debug(`Validating ${allocations.length} allocations for CIDR overlaps`);
      const validationResult = validateNoOverlappingCidrs(allocations, false);
      
      if (!validationResult.valid) {
        cliLogger.warn(`⚠️ Found ${validationResult.overlaps.length} CIDR overlaps in the allocations.`);
        
        // Log the first few overlaps
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
      if (error instanceof SubnetterError) {
        const errorCode = error.code ? `[${error.code}] ` : '';
        cliLogger.error(`❌ Error: ${errorCode}${error.message}`);
        
        // Display context information for debug level and above
        if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
          if (error.getContextString()) {
            cliLogger.debug(`Context: ${error.getContextString()}`);
          }
        }
        
        // Always show help text for users
        const helpText = error.getHelpText();
        if (helpText) {
          cliLogger.info(`💡 Help: ${helpText}`);
        }
        
        // Only log the stack trace at debug level and above
        if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
          if (error.stack) {
            cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
          }
        }
      } else {
        cliLogger.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (error instanceof Error && error.stack && 
            (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG)) {
          cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
        }
      }
      
      process.exit(1);
    }
  });

// Register the netbox-export command
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
      // Configure the logger based on the options
      configureLogger({
        level: options.verbose ? LogLevel.DEBUG : parseLogLevel(options.logLevel),
        useColor: options.color,
        timestamps: options.timestamps
      });
      
      cliLogger.debug('Command options:', options);
      
      // Get NetBox token from option or environment variable
      const netboxToken = options.netboxToken || process.env.NETBOX_TOKEN;
      if (!netboxToken) {
        throw new SubnetterError(
          'NetBox API token is required. Use --netbox-token or set NETBOX_TOKEN environment variable.',
          ErrorCode.MISSING_REQUIRED_FIELD,
          { option: 'netbox-token' }
        );
      }
      
      // Load the configuration
      configLogger.debug(`Loading config from: ${options.config}`);
      const config = await loadConfig(options.config);
      configLogger.debug('Config loaded successfully');
      
      // Create an allocator
      allocatorLogger.debug('Creating allocator instance');
      const allocator = new CidrAllocator(config);
      allocatorLogger.debug('Allocator created successfully');
      
      // Generate allocations
      allocatorLogger.debug('Generating CIDR allocations');
      let allocations = allocator.generateAllocations();
      allocatorLogger.debug(`Generated ${allocations.length} allocations`);
      
      // Apply provider filter if specified
      if (options.provider) {
        allocatorLogger.debug(`Filtering by provider: ${options.provider}`);
        allocations = filterAllocationsByProvider(allocations, options.provider);
        allocatorLogger.debug(`Filtered to ${allocations.length} allocations`);
      }
      
      // Create NetBox client
      cliLogger.debug(`Connecting to NetBox at: ${options.netboxUrl}`);
      const client = new NetBoxClient({
        url: options.netboxUrl,
        token: netboxToken,
      });
      
      // Test connection
      const connected = await client.testConnection();
      if (!connected) {
        throw new SubnetterError(
          `Unable to connect to NetBox at ${options.netboxUrl}`,
          ErrorCode.INVALID_OPERATION,
          { url: options.netboxUrl }
        );
      }
      cliLogger.debug('NetBox connection successful');
      
      // Create exporter and run export
      const exporter = new NetBoxExporter(client);
      
      if (options.dryRun) {
        cliLogger.info('🔍 Running in dry-run mode (no changes will be made)');
      }
      
      const result = await exporter.export(allocations, {
        dryRun: options.dryRun,
        prune: options.prune,
        status: options.status,
        createMissing: true,
        baseCidr: config.baseCidr,  // Pass base CIDR for Aggregate creation
      });
      
      // Display results
      cliLogger.info('');
      cliLogger.info('📊 Export Summary:');
      cliLogger.info(`   Created: ${result.summary.created}`);
      cliLogger.info(`   Updated: ${result.summary.updated}`);
      cliLogger.info(`   Deleted: ${result.summary.deleted}`);
      cliLogger.info(`   Skipped: ${result.summary.skipped}`);
      
      if (result.errors.length > 0) {
        cliLogger.warn(`   Errors: ${result.summary.errors}`);
        result.errors.forEach((err: { identifier: string; error: string }) => {
          cliLogger.warn(`     - ${err.identifier}: ${err.error}`);
        });
      }
      
      // Show detailed changes in verbose mode
      if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
        cliLogger.debug('');
        cliLogger.debug('Detailed Changes:');
        const icons: Record<string, string> = {
          create: '➕',
          update: '✏️',
          delete: '🗑️',
          skip: '⏭️',
        };
        result.changes.forEach((change: { operation: string; objectType: string; identifier: string; reason?: string }) => {
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
        process.exit(1);
      }
    } catch (error: unknown) {
      if (error instanceof NetBoxApiError) {
        cliLogger.error(`❌ NetBox API Error: ${error.message} (HTTP ${error.statusCode})`);
        if (error.response && options.verbose) {
          cliLogger.debug(`Response: ${JSON.stringify(error.response)}`);
        }
      } else if (error instanceof SubnetterError) {
        const errorCode = error.code ? `[${error.code}] ` : '';
        cliLogger.error(`❌ Error: ${errorCode}${error.message}`);
        
        // Display context information for debug level and above
        if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
          if (error.getContextString()) {
            cliLogger.debug(`Context: ${error.getContextString()}`);
          }
        }
        
        // Always show help text for users
        const helpText = error.getHelpText();
        if (helpText) {
          cliLogger.info(`💡 Help: ${helpText}`);
        }
        
        // Only log the stack trace at debug level and above
        if (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG) {
          if (error.stack) {
            cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
          }
        }
      } else {
        cliLogger.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (error instanceof Error && error.stack && 
            (options.verbose || parseLogLevel(options.logLevel) >= LogLevel.DEBUG)) {
          cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
        }
      }
      
      process.exit(1);
    }
  });

// Run the CLI
program.parse(); 
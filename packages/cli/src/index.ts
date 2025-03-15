#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { 
  loadConfig, 
  CidrAllocator, 
  writeAllocationsToCsv, 
  filterAllocationsByProvider,
  Account,
  CloudConfig,
  createLogger,
  configureLogger,
  LogLevel,
  parseLogLevel
} from '@subnetter/core';

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
  .version('1.3.1');

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

      // Write to CSV
      const outputPath = options.output;
      outputLogger.debug(`Writing allocations to CSV: ${outputPath}`);
      await writeAllocationsToCsv(allocations, outputPath);
      outputLogger.debug('CSV written successfully');

      cliLogger.info(`✅ Successfully generated ${allocations.length} subnet allocations.`);
      cliLogger.info(`📝 Results written to ${path.resolve(outputPath)}`);
    } catch (error: unknown) {
      cliLogger.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (error instanceof Error && error.stack) {
        // Only log the stack trace at debug level and above
        cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
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
        throw new Error(`Configuration file not found: ${options.config}`);
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
      cliLogger.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (error instanceof Error && error.stack) {
        // Only log the stack trace at debug level and above
        cliLogger.debug(`❌ Stack trace: \n${error.stack}`);
      }
      
      process.exit(1);
    }
  });

// Run the CLI
program.parse(); 
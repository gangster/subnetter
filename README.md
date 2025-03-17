# Subnetter - IPv4 CIDR Allocation Tool

[![CI/CD](https://github.com/gangster/subnetter/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/gangster/subnetter/actions/workflows/ci-cd.yml)
[![Docs Status](https://img.shields.io/badge/docs-online-brightgreen.svg)](https://gangster.github.io/subnetter/)
[![codecov](https://codecov.io/gh/gangster/subnetter/branch/main/graph/badge.svg)](https://codecov.io/gh/gangster/subnetter)
[![npm version](https://img.shields.io/npm/v/subnetter.svg)](https://www.npmjs.com/package/subnetter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A command-line tool for hierarchical IPv4 CIDR allocation across cloud infrastructure.

## Project Status

Subnetter is currently in active development. The core functionality for CIDR allocation is implemented and available through both the CLI and programmatic API. The project follows a monorepo structure with comprehensive test coverage and documentation. We have recently optimized our CI/CD pipeline for faster builds and more efficient testing across multiple Node.js versions.

## Project Structure

Subnetter is organized as a monorepo with multiple packages:

- **@subnetter/core**: Core CIDR allocation engine and utilities
- **@subnetter/cli**: Command-line interface for the tool
- **@subnetter/docs**: Documentation site built with Astro and Starlight

This modular design allows you to use the core functionality programmatically while also providing a convenient CLI and comprehensive documentation.

## The Problem

Managing IP address space in modern cloud environments presents several challenges:

### IP Address Management Complexity
- **Manual allocation is error-prone**: Hand-crafting CIDR blocks for hundreds of subnets across multiple regions leads to mistakes
- **Overlapping CIDRs cause connectivity issues**: Without a systematic approach, IP conflicts can cause outages and security vulnerabilities
- **Multi-cloud environments multiply complexity**: Each cloud provider requires its own network architecture, but needs to integrate with others

### Scaling Challenges
- **Growing organizations quickly exhaust IP space**: Without proper planning, organizations need painful re-IP projects as they grow
- **Future-proofing is difficult**: Planning for expansion across regions, accounts, and cloud providers requires complex calculations
- **Consistent documentation is hard to maintain**: Network diagrams and spreadsheets become outdated as infrastructure evolves

### Operational Overhead
- **Tracking allocated CIDRs across teams**: Different teams deploy resources in different regions with no central coordination
- **Limited visibility across environments**: Network admins struggle to understand the global IP addressing picture
- **Automation integration requires structured data**: Infrastructure-as-code tools need consistent, predictable IP allocation

Subnetter solves these problems through automated, hierarchical CIDR allocation that ensures consistency, prevents overlaps, documents all allocations, and scales with your organization—whether you're managing a single VPC or hundreds of accounts across multiple cloud providers.

## Features

### Implemented Features

- **Hierarchical IPv4 CIDR Allocation**: Allocate IP address ranges in a hierarchical manner (account → region → availability zone → subnet)
- **Multi-Cloud Provider Support**: Support for AWS, Azure, and GCP with provider-specific region naming conventions
- **Flexible Configuration System**: JSON/YAML configuration files with Zod schema validation
- **Deterministic Allocation**: Same input configuration always produces the same allocation results
- **CSV Output Format**: Generate allocations in CSV format for easy integration with other tools
- **Comprehensive Error Handling**: Hierarchical error system with specialized error types, error codes, context information, and actionable help text
- **Provider-Specific Filtering**: Filter allocation results by cloud provider
- **Variable Subnet Sizing**: Configure different prefix lengths for different subnet types based on workload requirements
- **Account-Level Overrides**: Specify different base CIDRs for specific accounts or cloud providers
- **Command-Line Interface**: Simple CLI for generating and validating allocations
- **Programmatic API**: Use core functionality in your own applications
- **Base CIDR Override**: Override the base CIDR block through command-line options
- **Comprehensive Documentation**: User guide, API reference, configuration reference and example scenarios

### Planned Features

- **IPv6 Support**: Extend allocation capabilities to IPv6 address space
- **Web Interface**: Provide a web-based UI for configuration and visualization
- **Terraform/CloudFormation Integration**: Direct integration with infrastructure-as-code tools
- **Custom Naming Conventions**: Allow customization of naming patterns for subnets and other resources
- **Visualization Tools**: Generate network diagrams from allocation results
- **IP Address Management (IPAM) Integration**: Integration with existing IPAM solutions

## Documentation

Comprehensive documentation is available at:

📚 **[Subnetter Documentation](https://gangster.github.io/subnetter/)**

The documentation site includes:

- [User Guide](https://gangster.github.io/subnetter/user-guide/) - Complete guide with usage examples and scenarios
- [Configuration Reference](https://gangster.github.io/subnetter/configuration/) - Detailed schema documentation
- [API Documentation](https://gangster.github.io/subnetter/api/overview/) - Reference for programmatic usage
- [Architecture](https://gangster.github.io/subnetter/architecture/) - Technical design and system components
- [CIDR Primer](https://gangster.github.io/subnetter/cidr-primer/) - Educational guide about IP addressing
- [Troubleshooting Guide](https://gangster.github.io/subnetter/troubleshooting/) - Solutions for common issues
- [Developer Guide](https://gangster.github.io/subnetter/developer-guide/) - For contributors who want to understand, modify, or extend the codebase

## Installation

```bash
# Install globally
npm install -g subnetter

# Or use with npx
npx subnetter
```

### Prerequisites

- **Node.js**: ^18.18.0 || ^20.9.0 || >=21.1.0
- **npm or yarn**: For package installation

## Development Setup

### Package Manager

This project uses Yarn exclusively as the package manager with a zero-install configuration:

- Yarn binary is included in the repository (`.yarn/releases/yarn-sources.cjs`)
- No global Yarn installation is required
- The project uses Yarn Workspaces for monorepo management

To work with this repository:

```bash
# Clone the repository
git clone https://github.com/gangster/subnetter.git
cd subnetter

# Use the included Yarn version
./yarn install

# Build all packages
./yarn build
```

### Build System

The project uses TypeScript's project references for a fast, reliable build process:

- Root `tsconfig.json` references individual package configurations
- Each package has its own `tsconfig.json` with specific settings
- CommonJS module format is used for compatibility

Build commands:

```bash
# Build all packages
yarn build

# Build specific packages
yarn build:core
yarn build:cli
yarn build:docs

# Development mode with watch
yarn dev
```

### TypeScript Configuration

- **Target**: ES2022
- **Module**: CommonJS
- **Configuration Files**:
  - `tsconfig.json`: Main configuration
  - `tsconfig.cjs.json`: CommonJS-specific configuration
  - `tsconfig.eslint.json`: Extended configuration for linting

### Testing Framework

- Jest is used for testing with TypeScript support
- Tests are organized by package and type (unit, integration, e2e)

## Usage

### Generate Allocations

```bash
subnetter generate --config config.json --output allocations.csv
```

Options:
- `--config, -c`: Path to configuration file (required, supports JSON or YAML formats)
- `--output, -o`: Path to output CSV file (default: allocations.csv)
- `--provider, -p`: Filter results by cloud provider
- `--base-cidr, -b`: Override base IPv4 CIDR block
- `--verbose, -v`: Enable verbose logging
- `--log-level, -l`: Set log level (silent, error, warn, info, debug, trace)
- `--no-color`: Disable colored output
- `--timestamps`: Include timestamps in log output

### Validate Configuration

```bash
subnetter validate --config config.json
```

Options:
- `--config, -c`: Path to configuration file (required, supports JSON or YAML formats)
- `--verbose, -v`: Enable verbose logging
- `--log-level, -l`: Set log level (silent, error, warn, info, debug, trace)
- `--no-color`: Disable colored output
- `--timestamps`: Include timestamps in log output

### Show Version

```bash
subnetter --version
```

## Configuration Format

The configuration file should be a JSON file that follows this structure:

```json
{
  "baseCidr": "10.0.0.0/8",
  "prefixLengths": {
    "account": 16,
    "region": 20,
    "az": 22
  },
  "cloudProviders": ["aws", "azure", "gcp"],
  "accounts": [
    {
      "name": "test-account",
      "clouds": {
        "aws": {
          "regions": ["us-east-1", "us-west-2"]
        },
        "azure": {
          "regions": ["eastus", "westus"]
        }
      }
    }
  ],
  "subnetTypes": {
    "Public": 24,
    "Private": 26,
    "Data": 28
  }
}
```

### Required Fields

- `baseCidr`: The base CIDR block from which all subnets will be allocated.
- `cloudProviders`: An array of cloud providers to generate subnets for.
- `accounts`: An array of account configurations.
- `subnetTypes`: Object defining subnet types and their prefix lengths.

### Optional Fields

- `prefixLengths`: Optional object to override the default prefix lengths for different levels of the hierarchy.

<!-- Documentation updated: 2023-03-20 -->

## Output Format

The tool generates a CSV file with the following columns:

| Column Name       | Description                                |
|-------------------|--------------------------------------------|
| Account Name      | The name of the account                    |
| VPC Name          | The name of the VPC (derived from account) |
| Cloud Provider    | The cloud provider (aws, azure, gcp)       |
| Region Name       | The name of the region                     |
| Availability Zone | The name of the availability zone (e.g., us-east-1a) |
| Region CIDR       | The CIDR block for the region              |
| VPC CIDR          | The CIDR block for the VPC                 |
| AZ CIDR           | The CIDR block for the availability zone   |
| Subnet CIDR       | The CIDR block for the subnet              |
| CIDR              | Duplicate of Subnet CIDR for compatibility |
| Subnet Role       | The type/role of the subnet                |
| Usable IPs        | The number of usable IP addresses          |

Example output:

```
Account Name,VPC Name,Cloud Provider,Region Name,Availability Zone,Region CIDR,VPC CIDR,AZ CIDR,Subnet CIDR,CIDR,Subnet Role,Usable IPs
innovation-test,innovation-test-vpc,aws,us-east-1,us-east-1a,10.0.0.0/20,10.0.0.0/16,10.0.0.0/24,10.0.0.0/28,10.0.0.0/28,Public,14
innovation-test,innovation-test-vpc,aws,us-east-1,us-east-1a,10.0.0.0/20,10.0.0.0/16,10.0.0.0/24,10.0.0.16/28,10.0.0.16/28,Private,14
```

## Programmatic Usage

You can also use the tool programmatically in your Node.js applications:

```javascript
// Import from the core package
const { loadConfig, CidrAllocator, writeAllocationsToCsv } = require('@subnetter/core');

async function generateAllocations() {
  try {
    // Load configuration (JSON or YAML formats are supported)
    const config = loadConfig('config.json'); // or 'config.yaml'
    
    // Generate allocations
    const allocator = new CidrAllocator(config);
    const allocations = allocator.generateAllocations();
    
    console.log(`Generated ${allocations.length} subnet allocations`);
    
    // Write to CSV
    await writeAllocationsToCsv(allocations, 'allocations.csv');
    console.log('Allocations written to CSV');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

generateAllocations();
```

For more advanced programmatic usage, see the [API Reference](https://gangster.github.io/subnetter/api/overview/).

## Contributing

Contributions are welcome! Please see our Developer Guide in the documentation site for information on setting up your development environment, coding standards, and the contribution process.

## Testing

Subnetter uses a comprehensive test suite organized by packages:

- **Package Tests**: Each package (`core`, `cli`) contains its own tests in the `tests/` directory
- **End-to-End Tests**: Integration tests that verify the complete workflow are located in `__tests__/e2e/`

To run tests:

```bash
# Run all package tests
yarn test

# Run tests with coverage for all packages
yarn test:coverage

# Run end-to-end tests
yarn test:e2e

# Merge coverage reports from different test runs
yarn test:coverage:merge

# Run tests for a specific package
yarn workspace @subnetter/core test
yarn workspace @subnetter/cli test

# Run linting across all packages
yarn lint
```

## License

MIT 

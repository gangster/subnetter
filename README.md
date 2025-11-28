# Subnetter - IPv4 CIDR Allocation Tool

[![CI/CD](https://github.com/gangster/subnetter/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/gangster/subnetter/actions/workflows/ci-cd.yml)
[![Docs Status](https://img.shields.io/badge/docs-online-brightgreen.svg)](https://gangster.github.io/subnetter/)
[![codecov](https://codecov.io/gh/gangster/subnetter/branch/main/graph/badge.svg)](https://codecov.io/gh/gangster/subnetter)
[![npm version](https://img.shields.io/npm/v/subnetter.svg)](https://www.npmjs.com/package/subnetter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A command-line tool and library for hierarchical IPv4 CIDR allocation across multi-cloud infrastructure with NetBox IPAM integration.

## Project Status

Subnetter is production-ready for IPv4 CIDR allocation. The project includes:
- Core allocation engine with deterministic, hierarchical allocation
- CLI with commands for generation, validation, analysis, and NetBox export
- NetBox IPAM integration for syncing allocations
- Comprehensive test coverage and documentation

## Packages

Subnetter is organized as a monorepo with the following packages:

| Package | Description | npm |
|---------|-------------|-----|
| **@subnetter/core** | Core CIDR allocation engine, configuration, and utilities | [![npm](https://img.shields.io/npm/v/@subnetter/core.svg)](https://www.npmjs.com/package/@subnetter/core) |
| **@subnetter/cli** | Command-line interface | [![npm](https://img.shields.io/npm/v/@subnetter/cli.svg)](https://www.npmjs.com/package/@subnetter/cli) |
| **@subnetter/netbox** | NetBox IPAM integration | [![npm](https://img.shields.io/npm/v/@subnetter/netbox.svg)](https://www.npmjs.com/package/@subnetter/netbox) |
| **@subnetter/cidr-utils** | Low-level CIDR utilities | [![npm](https://img.shields.io/npm/v/@subnetter/cidr-utils.svg)](https://www.npmjs.com/package/@subnetter/cidr-utils) |
| **@subnetter/docs** | Documentation site (Astro/Starlight) | - |

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

Subnetter solves these problems through automated, hierarchical CIDR allocation that ensures consistency, prevents overlaps, documents all allocations, and scales with your organization.

## Features

### Core Allocation
- **Hierarchical IPv4 CIDR Allocation**: Account → Region → Availability Zone → Subnet
- **Multi-Cloud Support**: AWS, Azure, and GCP with provider-specific AZ naming
- **Deterministic Output**: Same configuration always produces identical allocations
- **CIDR Overlap Detection**: Validates and prevents overlapping allocations
- **Variable Subnet Sizing**: Configure prefix lengths per subnet type
- **Account-Level Overrides**: Different base CIDRs for specific accounts/clouds

### Configuration & Output
- **Flexible Configuration**: JSON or YAML with Zod schema validation
- **CSV Output**: Structured output for integration with other tools
- **Provider Filtering**: Generate allocations for specific cloud providers

### NetBox Integration
- **Export to NetBox IPAM**: Sync allocations to NetBox prefixes
- **Automatic Object Creation**: Creates tenants, sites, locations, roles
- **Dry-Run Mode**: Preview changes before applying
- **Idempotent Operations**: Safe to run repeatedly

### Developer Experience
- **Comprehensive Error Handling**: `SubnetterError` hierarchy with codes and help text
- **Configurable Logging**: Multiple log levels with color and timestamp options
- **Full TypeScript Support**: Complete type definitions
- **Programmatic API**: Use as a library in your applications

## Documentation

📚 **[Subnetter Documentation](https://gangster.github.io/subnetter/)**

- [Getting Started](https://gangster.github.io/subnetter/getting-started/) - Quick start guide
- [Configuration](https://gangster.github.io/subnetter/configuration/) - Configuration reference
- [CLI Reference](https://gangster.github.io/subnetter/getting-started/cli/) - All CLI commands
- [API Overview](https://gangster.github.io/subnetter/api/overview/) - Programmatic usage
- [TypeDoc API](https://gangster.github.io/subnetter/typedoc/) - Auto-generated API reference
- [NetBox Integration](https://gangster.github.io/subnetter/integrations/netbox/) - IPAM integration guide
- [CIDR Primer](https://gangster.github.io/subnetter/cidr-primer/) - IP addressing basics

## Installation

```bash
# Install CLI globally
npm install -g @subnetter/cli

# Or use with npx
npx @subnetter/cli generate -c config.json

# Install for programmatic use
npm install @subnetter/core

# Install NetBox integration
npm install @subnetter/netbox
```

### Prerequisites

- **Node.js**: ^18.18.0 || ^20.9.0 || >=21.1.0

## CLI Usage

### Generate Allocations

```bash
subnetter generate -c config.json -o allocations.csv
```

Options:
- `-c, --config <path>`: Configuration file (JSON/YAML) **required**
- `-o, --output <path>`: Output CSV file (default: allocations.csv)
- `-p, --provider <name>`: Filter by cloud provider
- `-b, --base-cidr <cidr>`: Override base CIDR
- `-v, --verbose`: Enable debug logging
- `-l, --log-level <level>`: Log level (silent, error, warn, info, debug, trace)

### Validate Configuration

```bash
subnetter validate -c config.json
```

### Analyze Configuration

```bash
subnetter analyze -c config.json
```

Shows configuration statistics including account count, region count, and estimated subnet count.

### Validate Existing Allocations

```bash
subnetter validate-allocations -f allocations.csv
```

Checks an existing CSV file for CIDR overlaps.

### Export to NetBox

```bash
subnetter netbox-export -c config.json --netbox-url https://netbox.example.com --dry-run
```

Options:
- `--netbox-url <url>`: NetBox API URL **required**
- `--netbox-token <token>`: API token (or use `NETBOX_TOKEN` env var)
- `--dry-run`: Preview changes without applying
- `--prune`: Delete orphaned prefixes
- `--status <status>`: Prefix status (container, active, reserved, deprecated)

## Configuration

```json
{
  "baseCidr": "10.0.0.0/8",
  "prefixLengths": {
    "account": 16,
    "region": 20,
    "az": 22
  },
  "accounts": [
    {
      "name": "production",
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
    "public": 26,
    "private": 24,
    "database": 27
  }
}
```

### Required Fields

- `baseCidr`: Base CIDR block for allocation
- `accounts`: Array of account configurations with cloud/region mappings
- `subnetTypes`: Subnet types with their prefix lengths

### Optional Fields

- `prefixLengths`: Override default prefix lengths for account/region/az levels
- `cloudProviders`: Explicit list (usually inferred from accounts)

## Programmatic Usage

```typescript
import {
  loadConfig,
  CidrAllocator,
  writeAllocationsToCsv,
  validateNoOverlappingCidrs
} from '@subnetter/core';

async function main() {
  // Load and validate configuration
  const config = await loadConfig('./config.json');

  // Generate allocations
  const allocator = new CidrAllocator(config);
  const allocations = allocator.generateAllocations();

  // Validate no overlaps
  const validation = validateNoOverlappingCidrs(allocations);
  if (!validation.valid) {
    console.error(`Found ${validation.overlaps.length} overlaps`);
    process.exit(1);
  }

  // Write to CSV
  await writeAllocationsToCsv(allocations, './allocations.csv');
  console.log(`Generated ${allocations.length} allocations`);
}

main();
```

### NetBox Export

```typescript
import { CidrAllocator, loadConfig } from '@subnetter/core';
import { NetBoxClient, NetBoxExporter } from '@subnetter/netbox';

const config = await loadConfig('./config.json');
const allocator = new CidrAllocator(config);
const allocations = allocator.generateAllocations();

const client = new NetBoxClient({
  url: 'https://netbox.example.com',
  token: process.env.NETBOX_TOKEN!,
});

const exporter = new NetBoxExporter(client);
const result = await exporter.export(allocations, {
  dryRun: false,
  baseCidr: config.baseCidr,
});

console.log(`Created: ${result.summary.created}`);
console.log(`Updated: ${result.summary.updated}`);
```

### Error Handling

```typescript
import {
  loadConfig,
  SubnetterError,
  ConfigurationError,
  AllocationError,
  ErrorCode
} from '@subnetter/core';

try {
  const config = await loadConfig('./config.json');
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(`Config error [${error.code}]: ${error.message}`);
    console.log('Help:', error.getHelpText());
  } else if (error instanceof AllocationError) {
    if (error.code === ErrorCode.INSUFFICIENT_SPACE) {
      console.error('Not enough IP space. Try a larger base CIDR.');
    }
  }
}
```

## Output Format

| Column | Description |
|--------|-------------|
| Account Name | Account identifier |
| VPC Name | VPC name (account-region) |
| Cloud Provider | aws, azure, or gcp |
| Region Name | Cloud region |
| Availability Zone | AZ within region |
| Region CIDR | CIDR for the region |
| VPC CIDR | CIDR for the VPC |
| AZ CIDR | CIDR for the AZ |
| Subnet CIDR | CIDR for the subnet |
| Subnet Role | Subnet type/role |
| Usable IPs | Available IP addresses |

## Development

```bash
# Clone and install
git clone https://github.com/gangster/subnetter.git
cd subnetter
yarn install

# Build all packages
yarn build

# Run tests
yarn test
yarn test:e2e

# Lint
yarn lint
```

## Contributing

Contributions are welcome! See the [Developer Guide](https://gangster.github.io/subnetter/developer-guide/) for setup instructions and coding standards.

## License

MIT

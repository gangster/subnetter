# Subnetter: IPv4 CIDR Allocation Tool

## Executive Summary

Subnetter is a comprehensive tool designed to automate the allocation of IPv4 CIDR blocks across cloud infrastructures. It consists of three main components:

1. **Core Library (`@subnetter/core`)**: A TypeScript library that provides the core CIDR allocation functionality.
2. **Command-Line Interface (`@subnetter/cli`)**: A CLI tool that leverages the core library to generate CIDR allocations.
3. **Documentation Site (`@subnetter/docs`)**: A comprehensive documentation site built with Astro and Starlight.

The tool is designed to eliminate manual IP allocation errors, provide consistent subnet allocation across multiple cloud providers, and support infrastructure-as-code practices.

## Business Objectives

- **Eliminate Manual IP Allocation Errors**: Automate the process of allocating IP address ranges to prevent overlapping CIDRs and configuration errors.
- **Support Multi-Cloud Architectures**: Provide consistent IP allocation across AWS, Azure, and GCP environments.
- **Enable Infrastructure-as-Code**: Generate deterministic, reproducible IP allocations that can be integrated into infrastructure-as-code workflows.
- **Simplify Network Planning**: Provide a clear, hierarchical approach to IP space management across accounts, regions, and availability zones.

## Key Features

### Core Features (Implemented)

- **Hierarchical IPv4 CIDR Allocation**: Allocate IP address ranges in a hierarchical manner (account → region → availability zone → subnet).
- **Multi-Cloud Provider Support**: Support for AWS, Azure, and GCP with provider-specific region naming conventions.
- **Flexible Configuration System**: JSON/YAML configuration files with Zod schema validation.
- **Deterministic Allocation**: Same input configuration always produces the same allocation results.
- **CSV Output Format**: Generate allocations in CSV format for easy integration with other tools.
- **Comprehensive Error Handling**: Clear error messages for configuration issues and allocation failures.
- **Provider-Specific Filtering**: Filter allocation results by cloud provider.

### Planned Features (Future)

- **IPv6 Support**: Extend allocation capabilities to IPv6 address space.
- **Web Interface**: Provide a web-based UI for configuration and visualization.
- **Terraform/CloudFormation Integration**: Direct integration with infrastructure-as-code tools.
- **Custom Naming Conventions**: Allow customization of naming patterns for subnets and other resources.
- **Visualization Tools**: Generate network diagrams from allocation results.

## Technology Stack

- **Core Technologies**:
  - **TypeScript**: Strongly-typed language for robust code development
  - **Node.js**: JavaScript runtime for cross-platform compatibility
  - **Zod**: Schema validation for configuration files
  - **Commander.js**: Command-line interface framework
  - **CSV-Writer**: CSV file generation
  - **CIDR-Tools**: Low-level CIDR manipulation utilities

- **Testing Framework**:
  - **Jest**: Unit and integration testing
  - **TS-Jest**: TypeScript support for Jest

- **Documentation**:
  - **TypeDoc**: API documentation generation
  - **Astro/Starlight**: Documentation site framework
  - **Mermaid**: Diagram generation

- **CI/CD**:
  - **GitHub Actions**: Continuous integration and deployment
  - **Semantic Release**: Automated versioning and release management
  - **Commitlint**: Commit message validation

## System Architecture

### Monorepo Structure

The project is organized as a monorepo with the following packages:

```
subnetter/
├── packages/
│   ├── core/           # Core allocation functionality
│   ├── cli/            # Command-line interface
│   └── docs/           # Documentation site
├── __tests__/          # End-to-end tests
├── .github/            # GitHub Actions workflows
└── ...                 # Configuration files
```

### Core Package Architecture

The core package (`@subnetter/core`) is structured as follows:

```
core/
├── src/
│   ├── allocator/      # CIDR allocation logic
│   ├── config/         # Configuration loading and validation
│   ├── models/         # TypeScript interfaces and types
│   ├── output/         # Output formatting (CSV)
│   └── index.ts        # Public API exports
```

### CLI Package Architecture

The CLI package (`@subnetter/cli`) is structured as follows:

```
cli/
├── src/
│   ├── commands/       # CLI command implementations
│   └── index.ts        # CLI entry point
```

### Documentation Package Architecture

The documentation package (`@subnetter/docs`) is built with Astro and Starlight:

```
docs/
├── src/
│   ├── content/        # Documentation content
│   └── ...             # Astro components and configuration
```

## Domain Models

The system uses the following TypeScript interfaces to model the domain:

### Cloud Provider

```typescript
interface CloudProvider {
  name: string;
  regions: string[];
}
```

### Cloud Configuration

```typescript
interface CloudConfig {
  baseCidr?: string;
  regions: string[];
}
```

### Account

```typescript
interface Account {
  name: string;
  clouds: Record<string, CloudConfig>;
}
```

### Region

```typescript
interface Region {
  name: string;
  availabilityZones: string[];
  cidr?: string;
}
```

### Availability Zone

```typescript
interface AvailabilityZone {
  name: string;
  cidr?: string;
}
```

### Subnet Type

```typescript
type SubnetTypes = Record<string, number>;
```

### Allocation

```typescript
interface Allocation {
  accountName: string;
  vpcName: string;
  cloudProvider: string;
  regionName: string;
  availabilityZone: string;
  regionCidr: string;
  vpcCidr: string;
  azCidr: string;
  subnetCidr: string;
  cidr: string;
  subnetRole: string;
  usableIps: number;
}
```

### Configuration

```typescript
interface Config {
  baseCidr: string;
  prefixLengths?: {
    account?: number;
    region?: number;
    az?: number;
  };
  cloudProviders: string[];
  accounts: Account[];
  subnetTypes: Record<string, number>;
}
```

## Core CIDR Allocation Engine

The CIDR allocation engine is the heart of the system and follows these principles:

1. **Hierarchical Allocation**: IP space is divided hierarchically from a base CIDR:
   - Base CIDR → Account CIDRs → Region CIDRs → AZ CIDRs → Subnet CIDRs

2. **Deterministic Allocation**: The same input configuration always produces the same allocation results.

3. **No Overlapping CIDRs**: The system ensures that allocated CIDRs do not overlap.

4. **Optimal Prefix Length Calculation**: The system automatically calculates optimal prefix lengths based on the number of subnets needed at each level.

5. **Provider-Specific Logic**: The system handles provider-specific region naming conventions and requirements.

### Allocation Algorithm

1. Start with a base CIDR (e.g., `10.0.0.0/8`)
2. Divide it among accounts (or cloud-specific account configurations)
3. For each account, divide its CIDR among regions
4. For each region, divide its CIDR among availability zones (typically 3 per region)
5. For each AZ, divide its CIDR among subnet types (e.g., public, private, database)

## Configuration System

The configuration system uses Zod for schema validation and supports both JSON and YAML formats. The configuration file specifies:

1. **Base CIDR**: The starting IP address range (e.g., `10.0.0.0/8`)
2. **Prefix Lengths**: Optional specific prefix lengths for account, region, and AZ levels
3. **Cloud Providers**: List of supported cloud providers
4. **Accounts**: List of accounts with cloud-specific configurations
5. **Subnet Types**: List of subnet types with their prefix lengths

## CLI Interface

The CLI provides the following commands:

1. **generate**: Generate IPv4 allocations based on a configuration file
   ```
   subnetter generate -c config.json -o allocations.csv
   ```
   
   Options:
   - `--config, -c`: Path to configuration file (required)
   - `--output, -o`: Path to output CSV file (default: allocations.csv)
   - `--provider, -p`: Filter results by cloud provider
   - `--base-cidr, -b`: Override base IPv4 CIDR block
   - `--verbose, -v`: Enable verbose logging
   - `--log-level, -l`: Set log level (silent, error, warn, info, debug, trace)
   - `--no-color`: Disable colored output
   - `--timestamps`: Include timestamps in log output

2. **validate**: Validate a configuration file without generating allocations
   ```
   subnetter validate -c config.json
   ```
   
   Options:
   - `--config, -c`: Path to configuration file (required)
   - `--verbose, -v`: Enable verbose logging
   - `--log-level, -l`: Set log level (silent, error, warn, info, debug, trace)
   - `--no-color`: Disable colored output
   - `--timestamps`: Include timestamps in log output

## Testing Strategy

### Unit Testing

- **Coverage Target**: >90% code coverage
- **Focus Areas**: 
  - CIDR calculation functions
  - Configuration validation
  - Allocation algorithm edge cases

### End-to-End Testing

- **Test Scenarios**:
  - Single account with multiple regions
  - Multiple accounts across different cloud providers
  - Production-like configurations with complex hierarchies
  - Error handling for invalid configurations

### Test Implementation

- **Framework**: Jest with TypeScript support
- **Test Organization**: 
  - Unit tests alongside source code
  - E2E tests in a separate `__tests__/e2e` directory
- **CI Integration**: Tests run on every pull request and push to main

## Documentation

### API Documentation

- **Tool**: TypeDoc
- **Coverage**: All public APIs, classes, and interfaces
- **Format**: HTML and Markdown

### User Documentation

- **Platform**: Astro with Starlight
- **Content**: 
  - Getting started guide
  - Configuration reference
  - CLI command reference
  - Examples and tutorials
  - Architecture overview

## CI/CD Process

### Continuous Integration

- **Platform**: GitHub Actions
- **Triggers**: Pull requests and pushes to main
- **Steps**:
  - Lint code and commit messages
  - Build TypeScript code
  - Run unit and E2E tests
  - Generate code coverage reports
  - Check for dependency issues

### Continuous Deployment

- **Release Process**:
  - Semantic versioning using conventional commits
  - Automated changelog generation
  - GitHub release creation
  - Documentation site deployment

## Development Workflow

1. **Feature Development**:
   - Create feature branch from main
   - Implement feature with tests
   - Submit pull request

2. **Code Review Process**:
   - Automated checks (linting, tests)
   - Manual review by team members
   - Address feedback

3. **Release Process**:
   - Merge to main
   - Automated semantic versioning
   - Release notes generation
   - Package publishing

## Conclusion

Subnetter provides a robust, automated solution for IPv4 CIDR allocation across cloud environments. Its hierarchical approach, deterministic allocation, and multi-cloud support make it an essential tool for network planning and infrastructure-as-code workflows.
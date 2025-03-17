# Subnetter Example Configurations

This directory contains example configuration files for the Subnetter tool that demonstrate various usage patterns and network architectures.

## Configuration Format

All examples use the modern account format with cloud-specific configurations. Each configuration file follows this structure:

```json
{
  "baseCidr": "10.0.0.0/8",             // Base CIDR block for allocation
  "prefixLengths": {                    // Optional prefix lengths for hierarchy
    "account": 16,                      // Account level prefix length
    "region": 20,                       // Region level prefix length
    "az": 22                            // Availability zone level prefix length
  },
  "cloudProviders": ["aws", "azure", "gcp"], // List of cloud providers
  "accounts": [                        // List of accounts
    {
      "name": "example-account",       // Account name
      "clouds": {                      // Cloud-specific configurations
        "aws": {                       // AWS cloud configuration
          "baseCidr": "10.100.0.0/16", // Optional, overrides the global baseCidr
          "regions": ["us-east-1", "us-west-2"] // AWS regions
        },
        "azure": {                     // Azure cloud configuration
          "baseCidr": "10.101.0.0/16", // Optional, overrides the global baseCidr
          "regions": ["eastus", "westeurope"] // Azure regions
        }
      }
    }
  ],
  "subnetTypes": {                     // Subnet types to allocate
    "Public": 24,
    "Private": 26
  }
}
```

## Available Examples

### `config.json`
A comprehensive multi-cloud configuration with multiple accounts across AWS, Azure, and GCP. This example shows a typical enterprise setup with multiple environments.

### `config.yaml`
The YAML equivalent of a multi-cloud configuration. Demonstrates how to structure your configuration in YAML format.

### `config-with-diverse-account-names.json`
Shows how to use different naming patterns for accounts, including special characters and formats.

### `kubernetes-config.json`
A specialized configuration for Kubernetes environments with subnet types configured for typical Kubernetes networking requirements.

### `three-az-kubernetes-config.json`
An extension of the Kubernetes configuration that explicitly handles three availability zones per region.

## Using the Examples

You can use these examples as a starting point for your own configurations:

```bash
# Validate an example configuration
subnetter validate -c examples/config.json

# Generate allocations from an example
subnetter generate -c examples/config.json -o allocations.csv

# Filter by provider
subnetter generate -c examples/config.json -o aws-only.csv --provider aws

# Override the base CIDR without modifying the configuration file
subnetter generate -c examples/config.json -o custom-cidr.csv --base-cidr 172.16.0.0/12
```

## Creating Your Own Configurations

When creating your own configurations based on these examples:

1. Start with a large enough base CIDR (typically /8 or /12)
2. Define all cloud providers you'll be using
3. Structure your accounts with cloud-specific configurations
4. Define subnet types with appropriate prefix lengths based on your needs
5. Validate your configuration before generating allocations

## Advanced Features

### Base CIDR Override

You can override the base CIDR from the command line, which is useful for:
- Testing different IP ranges without modifying your configuration files
- Quickly generating alternate IP allocation plans
- Creating temporary allocations for specific use cases

```bash
# Generate allocations using a different base CIDR
subnetter generate -c examples/config.json -o private-ranges.csv --base-cidr 192.168.0.0/16

# This works with any configuration file
subnetter generate -c examples/kubernetes-config.json -o alternate-k8s.csv --base-cidr 10.128.0.0/12
```

Note that this override applies only to the global base CIDR. Account or cloud-specific base CIDR values in the configuration file will still take precedence for those specific accounts or clouds.

## Notes

- All accounts must use the cloud-specific configuration format with `clouds`
- Each cloud configuration must specify the regions
- Optional `baseCidr` can be specified for each cloud configuration to override the global one
- Subnet types define the subnets that will be created in each availability zone 
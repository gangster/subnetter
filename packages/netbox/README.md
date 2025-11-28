# @subnetter/netbox

NetBox IPAM integration for Subnetter.

## Installation

```bash
yarn add @subnetter/netbox
```

## Usage

### Export Allocations to NetBox

```typescript
import { loadConfig, CidrAllocator } from '@subnetter/core';
import { NetBoxClient, NetBoxExporter } from '@subnetter/netbox';

// Load Subnetter config and generate allocations
const config = await loadConfig('config.json');
const allocator = new CidrAllocator();
const allocations = allocator.allocate(config);

// Create NetBox client
const client = new NetBoxClient({
  url: 'https://netbox.example.com',
  token: process.env.NETBOX_TOKEN!,
});

// Export to NetBox
const exporter = new NetBoxExporter(client);
const result = await exporter.export(allocations, {
  dryRun: true,  // Set to false to apply changes
  createMissing: true,  // Create missing tenants/sites/roles
});

console.log('Export summary:', result.summary);
```

### Dry Run

```typescript
const result = await exporter.export(allocations, { dryRun: true });

for (const change of result.changes) {
  console.log(`${change.operation}: ${change.objectType} ${change.identifier}`);
}
```

## API

### NetBoxClient

HTTP client for the NetBox REST API.

```typescript
const client = new NetBoxClient({
  url: 'https://netbox.example.com',
  token: 'your-api-token',
  timeout: 30000,  // optional
});

// Test connection
await client.testConnection();

// IPAM operations
await client.prefixes.list({ status: 'active' });
await client.prefixes.create({ prefix: '10.0.0.0/24', status: 'reserved' });

// DCIM operations
await client.sites.list();
await client.sites.create({ name: 'us-east-1', slug: 'us-east-1' });

// Tenancy operations
await client.tenants.list();
await client.tenants.create({ name: 'production', slug: 'production' });
```

### NetBoxExporter

Exports Subnetter allocations to NetBox.

```typescript
const exporter = new NetBoxExporter(client);

const result = await exporter.export(allocations, {
  createMissing: true,   // Create missing tenants/sites/roles
  prune: false,          // Delete prefixes not in allocations
  status: 'reserved',    // Status for new prefixes
  dryRun: false,         // Actually apply changes
});
```

## Data Mapping

| Subnetter | NetBox |
|-----------|--------|
| Account | Tenant |
| Region | Site |
| Subnet Type | Role |
| Allocation | Prefix |
| Cloud Provider | Tag |
| Availability Zone | Tag (az:*) |

## Environment Variables

```bash
NETBOX_URL=https://netbox.example.com
NETBOX_TOKEN=your-api-token
```

## License

MIT


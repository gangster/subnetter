# NetBox Integration Design Document

## Overview

This document outlines the design for integrating Subnetter with NetBox, enabling bidirectional synchronization of IP address allocations between Subnetter's planning tool and NetBox's IPAM capabilities.

## Goals

1. **Export Subnetter allocations to NetBox** - Push planned network allocations to NetBox as the source of truth
2. **Validate against NetBox** - Check for conflicts between planned allocations and existing NetBox data
3. **Import from NetBox** - Generate Subnetter configurations from existing NetBox prefixes
4. **Maintain idempotency** - Support dry-run mode and incremental updates

## Non-Goals (Phase 1)

- Real-time synchronization
- NetBox webhooks/event handling
- Custom field management in NetBox
- VLAN/VXLAN integration
- Device/interface assignment

---

## Architecture

### Package Structure

```
packages/
├── netbox/                    # New package: @subnetter/netbox
│   ├── src/
│   │   ├── index.ts           # Public API exports
│   │   ├── client/
│   │   │   ├── NetBoxClient.ts      # HTTP client wrapper
│   │   │   ├── types.ts             # NetBox API types
│   │   │   └── endpoints/
│   │   │       ├── prefixes.ts      # /api/ipam/prefixes/
│   │   │       ├── aggregates.ts    # /api/ipam/aggregates/
│   │   │       ├── sites.ts         # /api/dcim/sites/
│   │   │       ├── tenants.ts       # /api/tenancy/tenants/
│   │   │       └── roles.ts         # /api/ipam/roles/
│   │   ├── export/
│   │   │   ├── exporter.ts          # Main export logic
│   │   │   ├── mapper.ts            # Subnetter → NetBox mapping
│   │   │   └── diff.ts              # Calculate changes
│   │   ├── import/
│   │   │   ├── importer.ts          # Main import logic
│   │   │   └── mapper.ts            # NetBox → Subnetter mapping
│   │   └── validate/
│   │       └── validator.ts         # Conflict detection
│   ├── tests/
│   └── package.json
├── cli/                       # Existing CLI package
│   └── src/
│       └── commands/
│           └── netbox.ts      # New netbox subcommands
```

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Subnetter      │     │  @subnetter/     │     │   NetBox    │
│  Config (JSON)  │────▶│  netbox          │────▶│   API       │
└─────────────────┘     └──────────────────┘     └─────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Allocations    │     │  Diff/Validate   │     │  Prefixes   │
│  (CSV)          │     │  Engine          │     │  Sites      │
└─────────────────┘     └──────────────────┘     │  Tenants    │
                                                 │  Roles      │
                                                 └─────────────┘
```

---

## NetBox Object Mapping

### Subnetter → NetBox Mapping (Updated for NetBox 4.x)

The mapping creates a proper hierarchy that mirrors cloud topology:

```
NetBox Hierarchy:
├── Regions (Cloud Providers)
│   ├── Amazon Web Services
│   ├── Microsoft Azure
│   └── Google Cloud Platform
│
├── Sites (Cloud Regions) - under their respective Region
│   ├── us-east-1 (under AWS)
│   ├── eastus (under Azure)
│   ├── us-east1 (under GCP)
│   └── ...
│
├── Locations (Availability Zones) - under their respective Site
│   ├── us-east-1a (under us-east-1)
│   ├── us-east-1b (under us-east-1)
│   └── ...
│
└── Prefixes (Subnets) - scoped to their Site
    ├── 10.0.0.0/24 (scope: us-east-1, tenant: my-account, role: Kubernetes)
    └── ...
```

| Subnetter Concept | NetBox Object | NetBox Field | Notes |
|-------------------|---------------|--------------|-------|
| Cloud Provider | **Region** | `name`, `slug` | Top-level: AWS, Azure, GCP |
| Cloud Region | **Site** | `name`, `slug`, `region` | e.g., us-east-1, under its provider Region |
| Availability Zone | **Location** | `name`, `slug`, `site` | e.g., us-east-1a, under its Site |
| Account Name | **Tenant** | `name`, `slug` | Organizational unit |
| Subnet Type/Role | **Role** | `name`, `slug` | e.g., Kubernetes, Public, Private |
| Subnet CIDR | **Prefix** | `prefix`, `scope_type`, `scope_id`, `tenant`, `role` | Scoped to Site (NetBox 4.x) |

> **Note**: In NetBox 4.x, the prefix-to-site relationship uses `scope_type` and `scope_id` instead of the deprecated `site` field.

### NetBox Prefix Status Mapping

| Allocation State | NetBox Status |
|------------------|---------------|
| Planned (from Subnetter) | `reserved` |
| Deployed (confirmed) | `active` |
| Deprecated | `deprecated` |

### Example NetBox Objects

**Aggregate (Base CIDR):**
```json
{
  "prefix": "10.0.0.0/8",
  "rir": { "name": "RFC1918" },
  "description": "Subnetter managed allocation",
  "tags": [{ "name": "subnetter-managed" }]
}
```

**Tenant (Account):**
```json
{
  "name": "ecommerce-production",
  "slug": "ecommerce-production",
  "description": "Production e-commerce account",
  "tags": [{ "name": "subnetter-managed" }]
}
```

**Site (Region):**
```json
{
  "name": "us-east-1",
  "slug": "us-east-1",
  "region": { "name": "US East" },
  "tags": [{ "name": "aws" }, { "name": "subnetter-managed" }]
}
```

**Role (Subnet Type):**
```json
{
  "name": "Public",
  "slug": "public",
  "description": "Internet-facing subnets"
}
```

**Prefix (Subnet):**
```json
{
  "prefix": "10.0.1.0/24",
  "status": "reserved",
  "tenant": { "name": "ecommerce-production" },
  "site": { "name": "us-east-1" },
  "role": { "name": "Public" },
  "description": "us-east-1a Public subnet",
  "tags": [
    { "name": "aws" },
    { "name": "subnetter-managed" },
    { "name": "az:us-east-1a" }
  ],
  "custom_fields": {
    "subnetter_az": "us-east-1a",
    "subnetter_account": "ecommerce-production",
    "subnetter_usable_ips": 251
  }
}
```

---

## CLI Commands

### `subnetter netbox export`

Export Subnetter allocations to NetBox.

```bash
subnetter netbox export \
  --config config.json \
  --netbox-url https://netbox.example.com \
  --netbox-token $NETBOX_TOKEN \
  [--tenant <name>]           # Optional: assign all to specific tenant
  [--create-missing]          # Create missing sites/tenants/roles
  [--dry-run]                 # Show what would be created/updated
  [--format json|table]       # Output format for dry-run
```

**Behavior:**
1. Load Subnetter config and generate allocations
2. Connect to NetBox API
3. Fetch existing prefixes with `subnetter-managed` tag
4. Calculate diff (create, update, delete)
5. If `--dry-run`, display changes and exit
6. Apply changes to NetBox
7. Report results

**Output (dry-run):**
```
NetBox Export Preview
=====================

Will CREATE:
  ✓ Tenant: ecommerce-production
  ✓ Site: us-east-1
  ✓ Site: us-west-2
  ✓ Role: Public
  ✓ Role: Private
  ✓ Prefix: 10.0.0.0/16 (ecommerce-production VPC)
  ✓ Prefix: 10.0.1.0/24 (us-east-1a Public)
  ... 58 more prefixes

Will UPDATE:
  ~ Prefix: 10.0.2.0/24 (description changed)

Will DELETE:
  ✗ Prefix: 10.0.99.0/24 (no longer in config)

Summary: 62 creates, 1 update, 1 delete

Run without --dry-run to apply changes.
```

### `subnetter netbox validate`

Check for conflicts between Subnetter config and NetBox.

```bash
subnetter netbox validate \
  --config config.json \
  --netbox-url https://netbox.example.com \
  --netbox-token $NETBOX_TOKEN \
  [--strict]                  # Fail on any overlap, even with same tenant
```

**Output:**
```
NetBox Validation Results
=========================

✓ No conflicts with existing NetBox prefixes

Warnings:
  ⚠ Prefix 10.0.5.0/24 exists in NetBox but not in Subnetter config
  ⚠ Tenant "legacy-account" exists in NetBox but not in Subnetter config

Summary: 0 conflicts, 2 warnings
```

### `subnetter netbox import`

Generate Subnetter config from existing NetBox prefixes.

```bash
subnetter netbox import \
  --netbox-url https://netbox.example.com \
  --netbox-token $NETBOX_TOKEN \
  --output config.json \
  [--tenant <name>]           # Filter by tenant
  [--site <name>]             # Filter by site
  [--tag <name>]              # Filter by tag
```

---

## Configuration

### Environment Variables

```bash
# NetBox connection
NETBOX_URL=https://netbox.example.com
NETBOX_TOKEN=your-api-token

# Optional defaults
NETBOX_DEFAULT_TENANT=default
NETBOX_SSL_VERIFY=true
```

### Config File Extension (Optional)

```json
{
  "baseCidr": "10.0.0.0/8",
  "netbox": {
    "url": "https://netbox.example.com",
    "defaultTenant": "my-org",
    "createMissing": true,
    "tags": ["subnetter-managed", "production"]
  },
  "accounts": [...]
}
```

---

## Error Handling

### Conflict Types

| Conflict | Severity | Behavior |
|----------|----------|----------|
| Overlapping prefix (different tenant) | Error | Block export |
| Overlapping prefix (same tenant) | Warning | Allow with flag |
| Missing tenant | Error | Block unless `--create-missing` |
| Missing site | Error | Block unless `--create-missing` |
| Missing role | Warning | Create automatically |
| API rate limit | Retry | Exponential backoff |
| Auth failure | Error | Immediate fail with clear message |

### Error Messages

```
Error: Prefix conflict detected

  Subnetter allocation: 10.0.1.0/24 (ecommerce-production, us-east-1, Public)
  NetBox prefix:        10.0.1.0/24 (legacy-tenant, us-east-1, Unknown)

  These prefixes overlap but belong to different tenants.
  
  Options:
    1. Update the NetBox prefix to match Subnetter's tenant
    2. Modify your Subnetter config to avoid this range
    3. Use --force to overwrite (dangerous)
```

---

## Testing Strategy

### Unit Tests
- Mapper functions (Subnetter ↔ NetBox)
- Diff calculation
- Conflict detection

### Integration Tests
- NetBox API client against mock server
- Full export/import cycle

### E2E Tests (requires running NetBox)
- Export allocations to real NetBox
- Validate against real NetBox
- Import from real NetBox
- Round-trip: export → import → compare

### Test Fixtures
```
packages/netbox/tests/fixtures/
├── subnetter-configs/
│   ├── simple.json
│   ├── multi-account.json
│   └── multi-cloud.json
├── netbox-responses/
│   ├── prefixes.json
│   ├── tenants.json
│   └── sites.json
└── expected-outputs/
    ├── export-diff.json
    └── import-config.json
```

---

## Implementation Phases

### Phase 1: Export (MVP)
- [ ] Create `@subnetter/netbox` package
- [ ] Implement NetBox API client
- [ ] Implement basic export (prefixes only)
- [ ] Add `netbox export` CLI command
- [ ] Add `--dry-run` support
- [ ] Basic documentation

### Phase 2: Validation & Robustness
- [ ] Implement conflict detection
- [ ] Add `netbox validate` CLI command
- [ ] Create missing tenants/sites/roles
- [ ] Improve error messages
- [ ] Add retry logic for API calls

### Phase 3: Import
- [ ] Implement NetBox → Subnetter mapping
- [ ] Add `netbox import` CLI command
- [ ] Handle partial imports (filters)
- [ ] Round-trip testing

### Phase 4: Advanced Features
- [ ] Custom field support
- [ ] VLAN integration
- [ ] Webhook support for sync
- [ ] Nautobot compatibility

---

## Open Questions

1. **AZ Representation**: Should AZs be Sites, Locations, or Tags in NetBox?
   - Sites: More structured, but creates many objects
   - Tags: Simpler, but less queryable
   - **Recommendation**: Tags with format `az:<az-name>`

2. **VPC Representation**: How to represent VPCs in NetBox?
   - Separate Prefix with role "VPC"
   - Custom field on child prefixes
   - **Recommendation**: Prefix with role "VPC" as container

3. **Deletion Policy**: What happens to NetBox prefixes removed from Subnetter?
   - Delete automatically
   - Mark as deprecated
   - Require explicit flag
   - **Recommendation**: Require `--prune` flag to delete

4. **Multi-tenancy**: One Subnetter config per NetBox tenant, or one config for all?
   - **Recommendation**: Support both via `--tenant` filter

---

## Dependencies

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "nock": "^13.4.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## References

- [NetBox REST API Documentation](https://demo.netbox.dev/api/docs/)
- [NetBox Docker](https://github.com/netbox-community/netbox-docker)
- [NetBox Data Model](https://docs.netbox.dev/en/stable/models/)


# CIDR Utilities

A pure JavaScript/TypeScript library for CIDR manipulation and subnet calculations. This package provides utilities for working with IPv4 CIDR notation, including validation, parsing, calculation, and subnet allocation.

## Features

- Pure JavaScript/TypeScript implementation with no external dependencies
- Comprehensive validation of CIDR notation
- IP address manipulation (conversion between string, numeric, and octet formats)
- CIDR parsing and normalization
- Subnet calculations (size, range, overlap detection)
- Subnet allocation utilities
- Detailed error handling with specific error types

## Installation

```bash
npm install @subnetter/cidr-utils
# or
yarn add @subnetter/cidr-utils
```

## Usage

### Basic CIDR Validation

```typescript
import { isValidIpv4Cidr, validateIpv4Cidr } from '@subnetter/cidr-utils';

// Check if a string is a valid CIDR
const isValid = isValidIpv4Cidr('192.168.1.0/24'); // true
const isInvalid = isValidIpv4Cidr('192.168.1.0/33'); // false

// Validate with error throwing
try {
  validateIpv4Cidr('192.168.1.0/24'); // No error
  validateIpv4Cidr('invalid-cidr'); // Throws CidrError
} catch (error) {
  console.error(error.message);
}
```

### IP Address Manipulation

```typescript
import { ipv4ToNumber, numberToIpv4, createIpAddress } from '@subnetter/cidr-utils';

// Convert between string and numeric formats
const ipNum = ipv4ToNumber('192.168.1.1'); // 3232235777
const ipStr = numberToIpv4(3232235777); // '192.168.1.1'

// Create a full IP address object
const ipAddress = createIpAddress('192.168.1.1');
console.log(ipAddress.asNumber); // 3232235777
console.log(ipAddress.octets); // [192, 168, 1, 1]
console.log(ipAddress.asString); // '192.168.1.1'
```

### CIDR Calculations

```typescript
import {
  calculateSubnetInfo,
  checkCidrOverlap,
  getCidrRange,
  subdivideCidr,
  calculateSupernet
} from '@subnetter/cidr-utils';

// Get subnet size information
const info = calculateSubnetInfo('192.168.1.0/24');
console.log(info.totalIps); // 256
console.log(info.usableIps); // 254

// Check if two CIDRs overlap
const overlaps = checkCidrOverlap('192.168.1.0/24', '192.168.1.128/25'); // true

// Get the IP range of a CIDR
const range = getCidrRange('192.168.1.0/24');
console.log(range.start.asString); // '192.168.1.0'
console.log(range.end.asString); // '192.168.1.255'

// Subdivide a CIDR into smaller subnets
const subnets = subdivideCidr('192.168.1.0/24', 1);
console.log(subnets.subnets); // ['192.168.1.0/25', '192.168.1.128/25']

// Calculate a supernet (parent network)
const supernet = calculateSupernet('192.168.1.0/24', 1); // '192.168.0.0/23'
```

### Subnet Allocation

```typescript
import {
  findNextAvailableCidr,
  allocateMultipleCidrs,
  isCidrAvailable
} from '@subnetter/cidr-utils';

// Find the next available subnet
const nextCidr = findNextAvailableCidr(
  '192.168.1.0/24', // parent CIDR
  26, // desired prefix length
  ['192.168.1.0/26', '192.168.1.64/26'] // already allocated CIDRs
);
console.log(nextCidr); // '192.168.1.128/26'

// Allocate multiple subnets at once
const cidrs = allocateMultipleCidrs(
  '192.168.1.0/24', // parent CIDR
  26, // desired prefix length
  2, // number of subnets to allocate
  ['192.168.1.0/26'] // already allocated CIDRs
);
console.log(cidrs); // ['192.168.1.64/26', '192.168.1.128/26']

// Check if a CIDR is available (not overlapping with allocated CIDRs)
const isAvailable = isCidrAvailable(
  '192.168.1.0/25',
  ['192.168.1.128/25']
);
console.log(isAvailable); // true
```

## Error Handling

The library uses a custom `CidrError` class for all errors, with specific error types:

```typescript
import { CidrErrorType } from '@subnetter/cidr-utils';

try {
  // Some operation that might fail
} catch (error) {
  if (error.type === CidrErrorType.INVALID_FORMAT) {
    // Handle invalid format error
  } else if (error.type === CidrErrorType.INVALID_IP) {
    // Handle invalid IP error
  } else if (error.type === CidrErrorType.INVALID_PREFIX) {
    // Handle invalid prefix error
  } else if (error.type === CidrErrorType.INVALID_OPERATION) {
    // Handle invalid operation error
  }
}
```

## License

MIT 
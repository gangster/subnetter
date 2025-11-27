/**
 * Comprehensive Validation Test Suite
 * 
 * This test suite validates that subnetter produces correct, logical, and
 * cloud-compliant IP allocations across a wide range of real-world configurations.
 * 
 * Validation Categories:
 * 1. No CIDR overlaps within allocations
 * 2. Cloud-specific AZ naming conventions
 * 3. CIDR hierarchy consistency (parent contains children)
 * 4. IP address logical consistency
 * 5. Subnet sizing correctness
 * 6. Provider-specific region validation
 */

import fs from 'fs';
import path from 'path';
import { 
  loadConfig, 
  CidrAllocator, 
  validateNoOverlappingCidrs 
} from '@subnetter/core';
import { 
  isValidIpv4Cidr, 
  parseCidr,
  getCidrRange
} from '@subnetter/cidr-utils';

// Increase timeout for comprehensive tests
jest.setTimeout(60000);

// Test fixture directories
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const EXAMPLES_DIR = path.resolve(process.cwd(), 'examples');
const TEST_CONFIGS_DIR = path.resolve(EXAMPLES_DIR, 'test-configs');

// Types
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
  subnetRole: string;
  usableIps: number;
}

interface ValidationReport {
  configPath: string;
  totalAllocations: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isValid: boolean;
}

interface ValidationError {
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ValidationWarning {
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

// Cloud-specific AZ naming patterns
const AWS_AZ_PATTERN = /^[a-z]{2}-[a-z]+-\d[a-z]$/;
const AZURE_AZ_PATTERN = /^[a-z]+-\d$/;
const GCP_AZ_PATTERN = /^[a-z]+-[a-z]+\d[a-z]$/;

// AWS region to expected AZ suffixes mapping (for special cases)
const AWS_SPECIAL_AZ_MAPPINGS: Record<string, string[]> = {
  'us-west-1': ['a', 'c'], // us-west-1 has no 'b'
  'ap-northeast-1': ['a', 'c', 'd'], // Tokyo has no 'b'
};

/**
 * Validates that a CIDR is contained within a parent CIDR
 */
function isContainedIn(childCidr: string, parentCidr: string): boolean {
  try {
    const childRange = getCidrRange(childCidr);
    const parentRange = getCidrRange(parentCidr);
    
    // Child must start at or after parent start
    // Child must end at or before parent end
    return childRange.start.asNumber >= parentRange.start.asNumber &&
           childRange.end.asNumber <= parentRange.end.asNumber;
  } catch {
    return false;
  }
}

/**
 * Calculates expected usable IPs for a prefix length
 */
function calculateExpectedUsableIps(prefixLength: number): number {
  if (prefixLength >= 31) return prefixLength === 31 ? 2 : 1;
  return Math.pow(2, 32 - prefixLength) - 2; // Subtract network and broadcast
}

/**
 * Validates AWS AZ naming
 */
function validateAwsAzName(regionName: string, azName: string): { valid: boolean; error?: string } {
  // AWS AZs should be region + letter (e.g., us-east-1a)
  if (!azName.startsWith(regionName)) {
    return { valid: false, error: `AZ ${azName} should start with region ${regionName}` };
  }
  
  const suffix = azName.slice(regionName.length);
  if (!/^[a-f]$/.test(suffix)) {
    return { valid: false, error: `AZ suffix '${suffix}' should be a letter a-f` };
  }
  
  // Check special cases
  const specialMapping = AWS_SPECIAL_AZ_MAPPINGS[regionName];
  if (specialMapping && !specialMapping.includes(suffix)) {
    return { 
      valid: false, 
      error: `AZ ${azName} uses invalid suffix for ${regionName}. Valid: ${specialMapping.join(', ')}` 
    };
  }
  
  return { valid: true };
}

/**
 * Validates Azure AZ naming
 */
function validateAzureAzName(regionName: string, azName: string): { valid: boolean; error?: string } {
  // Azure AZs should be region-N (e.g., eastus-1)
  const expectedPrefix = regionName.toLowerCase().replace(/\s+/g, '');
  if (!azName.startsWith(expectedPrefix)) {
    return { valid: false, error: `AZ ${azName} should start with region ${expectedPrefix}` };
  }
  
  const suffix = azName.slice(expectedPrefix.length);
  if (!/^-[1-3]$/.test(suffix)) {
    return { valid: false, error: `AZ suffix '${suffix}' should be -1, -2, or -3` };
  }
  
  return { valid: true };
}

/**
 * Validates GCP AZ (zone) naming
 */
function validateGcpAzName(regionName: string, azName: string): { valid: boolean; error?: string } {
  // GCP zones should be region + letter (e.g., us-central1a or us-central1-a)
  const normalizedRegion = regionName.toLowerCase();
  
  // GCP can use region+letter or region-letter format
  if (!azName.startsWith(normalizedRegion)) {
    return { valid: false, error: `Zone ${azName} should start with region ${normalizedRegion}` };
  }
  
  const suffix = azName.slice(normalizedRegion.length);
  // Accept both 'a' and '-a' formats
  if (!/^-?[a-f]$/.test(suffix)) {
    return { valid: false, error: `Zone suffix '${suffix}' should be a letter a-f` };
  }
  
  return { valid: true };
}

/**
 * Comprehensive validation of allocations
 */
function validateAllocations(allocations: Allocation[], configPath: string): ValidationReport {
  const report: ValidationReport = {
    configPath,
    totalAllocations: allocations.length,
    errors: [],
    warnings: [],
    isValid: true,
  };

  // 1. Validate no overlaps
  const overlapResult = validateNoOverlappingCidrs(allocations);
  if (!overlapResult.valid) {
    report.isValid = false;
    overlapResult.overlaps.forEach(overlap => {
      report.errors.push({
        type: 'CIDR_OVERLAP',
        message: `CIDR overlap: ${overlap.cidr1} overlaps with ${overlap.cidr2}`,
        details: {
          allocation1: {
            account: overlap.allocation1.accountName,
            region: overlap.allocation1.regionName,
            az: overlap.allocation1.availabilityZone,
            role: overlap.allocation1.subnetRole,
          },
          allocation2: {
            account: overlap.allocation2.accountName,
            region: overlap.allocation2.regionName,
            az: overlap.allocation2.availabilityZone,
            role: overlap.allocation2.subnetRole,
          },
        },
      });
    });
  }

  // 2. Validate each allocation
  allocations.forEach((allocation, index) => {
    // 2a. Validate CIDR format
    if (!isValidIpv4Cidr(allocation.subnetCidr)) {
      report.isValid = false;
      report.errors.push({
        type: 'INVALID_CIDR_FORMAT',
        message: `Invalid subnet CIDR format: ${allocation.subnetCidr}`,
        details: { allocation, index },
      });
    }

    // 2b. Validate CIDR hierarchy (subnet ⊂ AZ ⊂ region ⊂ VPC)
    if (!isContainedIn(allocation.subnetCidr, allocation.azCidr)) {
      report.isValid = false;
      report.errors.push({
        type: 'HIERARCHY_VIOLATION',
        message: `Subnet CIDR ${allocation.subnetCidr} not contained in AZ CIDR ${allocation.azCidr}`,
        details: { allocation, index },
      });
    }

    if (!isContainedIn(allocation.azCidr, allocation.regionCidr)) {
      report.isValid = false;
      report.errors.push({
        type: 'HIERARCHY_VIOLATION',
        message: `AZ CIDR ${allocation.azCidr} not contained in Region CIDR ${allocation.regionCidr}`,
        details: { allocation, index },
      });
    }

    if (!isContainedIn(allocation.regionCidr, allocation.vpcCidr)) {
      report.isValid = false;
      report.errors.push({
        type: 'HIERARCHY_VIOLATION',
        message: `Region CIDR ${allocation.regionCidr} not contained in VPC CIDR ${allocation.vpcCidr}`,
        details: { allocation, index },
      });
    }

    // 2c. Validate cloud-specific AZ naming
    const provider = allocation.cloudProvider.toLowerCase();
    let azValidation: { valid: boolean; error?: string } = { valid: true };

    if (provider === 'aws') {
      azValidation = validateAwsAzName(allocation.regionName, allocation.availabilityZone);
    } else if (provider === 'azure') {
      azValidation = validateAzureAzName(allocation.regionName, allocation.availabilityZone);
    } else if (provider === 'gcp') {
      azValidation = validateGcpAzName(allocation.regionName, allocation.availabilityZone);
    }

    if (!azValidation.valid) {
      report.warnings.push({
        type: 'AZ_NAMING_WARNING',
        message: azValidation.error || 'Invalid AZ naming',
        details: { allocation, index },
      });
    }

    // 2d. Validate usable IPs calculation
    const prefixLength = parseInt(allocation.subnetCidr.split('/')[1], 10);
    const expectedUsableIps = calculateExpectedUsableIps(prefixLength);
    if (allocation.usableIps !== expectedUsableIps) {
      report.warnings.push({
        type: 'USABLE_IPS_MISMATCH',
        message: `Usable IPs mismatch: got ${allocation.usableIps}, expected ${expectedUsableIps} for /${prefixLength}`,
        details: { allocation, index, expected: expectedUsableIps },
      });
    }

    // 2e. Validate prefix lengths are reasonable
    if (prefixLength < 16 || prefixLength > 30) {
      report.warnings.push({
        type: 'UNUSUAL_PREFIX_LENGTH',
        message: `Unusual prefix length /${prefixLength} for subnet`,
        details: { allocation, index },
      });
    }
  });

  // 3. Validate logical groupings
  const accountRegionGroups = new Map<string, Set<string>>();
  allocations.forEach(allocation => {
    const key = `${allocation.accountName}:${allocation.cloudProvider}`;
    if (!accountRegionGroups.has(key)) {
      accountRegionGroups.set(key, new Set());
    }
    accountRegionGroups.get(key)!.add(allocation.regionName);
  });

  // Check that each account-provider combination has consistent VPC CIDRs
  const accountVpcCidrs = new Map<string, Set<string>>();
  allocations.forEach(allocation => {
    const key = `${allocation.accountName}:${allocation.cloudProvider}`;
    if (!accountVpcCidrs.has(key)) {
      accountVpcCidrs.set(key, new Set());
    }
    accountVpcCidrs.get(key)!.add(allocation.vpcCidr);
  });

  // Multiple VPC CIDRs per account-provider is usually intentional, but worth noting
  accountVpcCidrs.forEach((cidrs, key) => {
    if (cidrs.size > 1) {
      report.warnings.push({
        type: 'MULTIPLE_VPC_CIDRS',
        message: `Account-provider ${key} has multiple VPC CIDRs: ${Array.from(cidrs).join(', ')}`,
        details: { accountProvider: key, cidrs: Array.from(cidrs) },
      });
    }
  });

  return report;
}

/**
 * Runs validation on a config file and returns the report
 */
function validateConfigFile(configPath: string): ValidationReport {
  try {
    const config = loadConfig(configPath);
    const allocator = new CidrAllocator(config);
    const allocations = allocator.generateAllocations();
    return validateAllocations(allocations, configPath);
  } catch (error) {
    return {
      configPath,
      totalAllocations: 0,
      errors: [{
        type: 'CONFIG_LOAD_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error loading config',
        details: { error },
      }],
      warnings: [],
      isValid: false,
    };
  }
}

describe('Comprehensive Allocation Validation', () => {
  describe('E2E Fixture Configs', () => {
    const fixtureFiles = fs.readdirSync(FIXTURES_DIR)
      .filter(f => f.endsWith('.json'));

    test.each(fixtureFiles)('validates %s produces correct allocations', (filename) => {
      const configPath = path.join(FIXTURES_DIR, filename);
      const report = validateConfigFile(configPath);

      // Log summary for debugging
      console.log(`\n${filename}:`);
      console.log(`  Total allocations: ${report.totalAllocations}`);
      console.log(`  Errors: ${report.errors.length}`);
      console.log(`  Warnings: ${report.warnings.length}`);

      if (report.errors.length > 0) {
        console.log('  Error details:');
        report.errors.slice(0, 5).forEach(e => console.log(`    - ${e.type}: ${e.message}`));
        if (report.errors.length > 5) {
          console.log(`    ... and ${report.errors.length - 5} more errors`);
        }
      }

      expect(report.errors.filter(e => e.type === 'CIDR_OVERLAP')).toHaveLength(0);
      expect(report.errors.filter(e => e.type === 'INVALID_CIDR_FORMAT')).toHaveLength(0);
      expect(report.errors.filter(e => e.type === 'HIERARCHY_VIOLATION')).toHaveLength(0);
    });
  });

  describe('Example Configs', () => {
    const exampleFiles = fs.readdirSync(EXAMPLES_DIR)
      .filter(f => f.endsWith('.json') && !f.includes('overlap'));

    test.each(exampleFiles)('validates %s produces correct allocations', (filename) => {
      const configPath = path.join(EXAMPLES_DIR, filename);
      const report = validateConfigFile(configPath);

      console.log(`\n${filename}:`);
      console.log(`  Total allocations: ${report.totalAllocations}`);
      console.log(`  Errors: ${report.errors.length}`);
      console.log(`  Warnings: ${report.warnings.length}`);

      expect(report.errors.filter(e => e.type === 'CIDR_OVERLAP')).toHaveLength(0);
      expect(report.errors.filter(e => e.type === 'INVALID_CIDR_FORMAT')).toHaveLength(0);
      expect(report.errors.filter(e => e.type === 'HIERARCHY_VIOLATION')).toHaveLength(0);
    });
  });

  describe('Test Configs', () => {
    // Only test valid configs (skip invalid-* configs)
    const testConfigFiles = fs.existsSync(TEST_CONFIGS_DIR)
      ? fs.readdirSync(TEST_CONFIGS_DIR)
          .filter(f => f.endsWith('.json') && !f.startsWith('invalid-'))
      : [];

    if (testConfigFiles.length > 0) {
      test.each(testConfigFiles)('validates %s produces correct allocations', (filename) => {
        const configPath = path.join(TEST_CONFIGS_DIR, filename);
        const report = validateConfigFile(configPath);

        console.log(`\n${filename}:`);
        console.log(`  Total allocations: ${report.totalAllocations}`);
        console.log(`  Errors: ${report.errors.length}`);

        expect(report.errors.filter(e => e.type === 'CIDR_OVERLAP')).toHaveLength(0);
        expect(report.errors.filter(e => e.type === 'INVALID_CIDR_FORMAT')).toHaveLength(0);
        expect(report.errors.filter(e => e.type === 'HIERARCHY_VIOLATION')).toHaveLength(0);
      });
    }
  });
});

describe('Cloud-Specific AZ Naming Validation', () => {
  describe('AWS AZ Naming', () => {
    test('validates standard AWS AZ names', () => {
      expect(validateAwsAzName('us-east-1', 'us-east-1a').valid).toBe(true);
      expect(validateAwsAzName('us-east-1', 'us-east-1b').valid).toBe(true);
      expect(validateAwsAzName('us-east-1', 'us-east-1c').valid).toBe(true);
      expect(validateAwsAzName('eu-west-1', 'eu-west-1a').valid).toBe(true);
    });

    test('rejects invalid AWS AZ names', () => {
      expect(validateAwsAzName('us-east-1', 'us-east-2a').valid).toBe(false);
      expect(validateAwsAzName('us-east-1', 'us-east-1').valid).toBe(false);
      expect(validateAwsAzName('us-east-1', 'us-east-1z').valid).toBe(false);
    });

    test('validates special case regions', () => {
      // us-west-1 only has a and c (no b)
      expect(validateAwsAzName('us-west-1', 'us-west-1a').valid).toBe(true);
      expect(validateAwsAzName('us-west-1', 'us-west-1c').valid).toBe(true);
      expect(validateAwsAzName('us-west-1', 'us-west-1b').valid).toBe(false);
      
      // ap-northeast-1 has a, c, d (no b)
      expect(validateAwsAzName('ap-northeast-1', 'ap-northeast-1a').valid).toBe(true);
      expect(validateAwsAzName('ap-northeast-1', 'ap-northeast-1c').valid).toBe(true);
      expect(validateAwsAzName('ap-northeast-1', 'ap-northeast-1d').valid).toBe(true);
      expect(validateAwsAzName('ap-northeast-1', 'ap-northeast-1b').valid).toBe(false);
    });
  });

  describe('Azure AZ Naming', () => {
    test('validates standard Azure AZ names', () => {
      expect(validateAzureAzName('eastus', 'eastus-1').valid).toBe(true);
      expect(validateAzureAzName('eastus', 'eastus-2').valid).toBe(true);
      expect(validateAzureAzName('eastus', 'eastus-3').valid).toBe(true);
      expect(validateAzureAzName('westeurope', 'westeurope-1').valid).toBe(true);
    });

    test('rejects invalid Azure AZ names', () => {
      expect(validateAzureAzName('eastus', 'eastus-0').valid).toBe(false);
      expect(validateAzureAzName('eastus', 'eastus-4').valid).toBe(false);
      expect(validateAzureAzName('eastus', 'westus-1').valid).toBe(false);
    });
  });

  describe('GCP Zone Naming', () => {
    test('validates standard GCP zone names', () => {
      expect(validateGcpAzName('us-central1', 'us-central1a').valid).toBe(true);
      expect(validateGcpAzName('us-central1', 'us-central1b').valid).toBe(true);
      expect(validateGcpAzName('us-central1', 'us-central1-a').valid).toBe(true);
      expect(validateGcpAzName('europe-west1', 'europe-west1b').valid).toBe(true);
    });

    test('rejects invalid GCP zone names', () => {
      expect(validateGcpAzName('us-central1', 'us-central2a').valid).toBe(false);
      expect(validateGcpAzName('us-central1', 'us-central1z').valid).toBe(false);
    });
  });
});

describe('CIDR Hierarchy Validation', () => {
  test('validates correct hierarchy containment', () => {
    expect(isContainedIn('10.0.0.0/24', '10.0.0.0/16')).toBe(true);
    expect(isContainedIn('10.0.1.0/24', '10.0.0.0/16')).toBe(true);
    expect(isContainedIn('10.0.0.0/26', '10.0.0.0/24')).toBe(true);
    expect(isContainedIn('10.0.0.64/26', '10.0.0.0/24')).toBe(true);
  });

  test('rejects incorrect hierarchy containment', () => {
    expect(isContainedIn('10.1.0.0/24', '10.0.0.0/16')).toBe(false);
    expect(isContainedIn('10.0.0.0/16', '10.0.0.0/24')).toBe(false);
    expect(isContainedIn('192.168.0.0/24', '10.0.0.0/8')).toBe(false);
  });

  test('validates edge cases', () => {
    // Same CIDR is contained in itself
    expect(isContainedIn('10.0.0.0/24', '10.0.0.0/24')).toBe(true);
    
    // /32 is contained in its parent /24
    expect(isContainedIn('10.0.0.1/32', '10.0.0.0/24')).toBe(true);
  });
});

describe('Usable IPs Calculation', () => {
  test('calculates correct usable IPs for standard prefix lengths', () => {
    expect(calculateExpectedUsableIps(24)).toBe(254);
    expect(calculateExpectedUsableIps(25)).toBe(126);
    expect(calculateExpectedUsableIps(26)).toBe(62);
    expect(calculateExpectedUsableIps(27)).toBe(30);
    expect(calculateExpectedUsableIps(28)).toBe(14);
    expect(calculateExpectedUsableIps(29)).toBe(6);
    expect(calculateExpectedUsableIps(30)).toBe(2);
  });

  test('handles edge cases', () => {
    expect(calculateExpectedUsableIps(31)).toBe(2); // Point-to-point
    expect(calculateExpectedUsableIps(32)).toBe(1); // Single host
    expect(calculateExpectedUsableIps(16)).toBe(65534);
  });
});

describe('Large-Scale Configuration Validation', () => {
  test('validates 32-region configuration produces no overlaps', () => {
    const configPath = path.join(EXAMPLES_DIR, '32-regions-test.json');
    if (!fs.existsSync(configPath)) {
      console.log('Skipping 32-regions test - file not found');
      return;
    }

    const report = validateConfigFile(configPath);

    console.log(`\n32-regions-test.json:`);
    console.log(`  Total allocations: ${report.totalAllocations}`);
    console.log(`  Errors: ${report.errors.length}`);
    console.log(`  Warnings: ${report.warnings.length}`);

    // Should have many allocations (32 regions × 3 AZs × 4 subnet types = 384)
    expect(report.totalAllocations).toBeGreaterThan(300);
    
    // No overlaps
    expect(report.errors.filter(e => e.type === 'CIDR_OVERLAP')).toHaveLength(0);
    
    // No hierarchy violations
    expect(report.errors.filter(e => e.type === 'HIERARCHY_VIOLATION')).toHaveLength(0);
  });

  test('validates multi-cloud production config', () => {
    const configPath = path.join(FIXTURES_DIR, 'production-config.json');
    if (!fs.existsSync(configPath)) {
      console.log('Skipping production-config test - file not found');
      return;
    }

    const report = validateConfigFile(configPath);

    console.log(`\nproduction-config.json:`);
    console.log(`  Total allocations: ${report.totalAllocations}`);
    console.log(`  Errors: ${report.errors.length}`);

    // Should have significant allocations
    expect(report.totalAllocations).toBeGreaterThan(50);
    
    // No critical errors
    expect(report.errors.filter(e => e.type === 'CIDR_OVERLAP')).toHaveLength(0);
    expect(report.errors.filter(e => e.type === 'HIERARCHY_VIOLATION')).toHaveLength(0);
  });
});

describe('Edge Case Configurations', () => {
  test('validates minimal single-region config', () => {
    const configPath = path.join(TEST_CONFIGS_DIR, 'minimal-config.json');
    if (!fs.existsSync(configPath)) {
      console.log('Skipping minimal-config test - file not found');
      return;
    }

    const report = validateConfigFile(configPath);
    expect(report.isValid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  test('validates config with account-specific CIDR overrides', () => {
    const configPath = path.join(TEST_CONFIGS_DIR, 'account-cidr-override-config.json');
    if (!fs.existsSync(configPath)) {
      console.log('Skipping account-cidr-override test - file not found');
      return;
    }

    const report = validateConfigFile(configPath);
    
    // Should have no overlaps even with different base CIDRs
    expect(report.errors.filter(e => e.type === 'CIDR_OVERLAP')).toHaveLength(0);
  });
});

describe('Determinism Validation', () => {
  test('produces identical output for same input', () => {
    const configPath = path.join(FIXTURES_DIR, 'basic-config.json');
    if (!fs.existsSync(configPath)) {
      console.log('Skipping determinism test - file not found');
      return;
    }

    // Run allocation twice
    const config = loadConfig(configPath);
    const allocator1 = new CidrAllocator(config);
    const allocator2 = new CidrAllocator(config);
    
    const allocations1 = allocator1.generateAllocations();
    const allocations2 = allocator2.generateAllocations();

    // Should produce identical results
    expect(allocations1.length).toBe(allocations2.length);
    
    // Compare each allocation
    allocations1.forEach((alloc1, index) => {
      const alloc2 = allocations2[index];
      expect(alloc1.subnetCidr).toBe(alloc2.subnetCidr);
      expect(alloc1.accountName).toBe(alloc2.accountName);
      expect(alloc1.regionName).toBe(alloc2.regionName);
      expect(alloc1.availabilityZone).toBe(alloc2.availabilityZone);
      expect(alloc1.subnetRole).toBe(alloc2.subnetRole);
    });
  });
});

describe('Summary Report', () => {
  test('generates comprehensive validation report for fixture configs', () => {
    const allConfigs: string[] = [];
    
    // Only collect fixture configs (not all examples to keep test fast)
    if (fs.existsSync(FIXTURES_DIR)) {
      fs.readdirSync(FIXTURES_DIR)
        .filter(f => f.endsWith('.json'))
        .forEach(f => allConfigs.push(path.join(FIXTURES_DIR, f)));
    }

    const reports = allConfigs.map(validateConfigFile);
    
    // Summary statistics
    const totalConfigs = reports.length;
    const validConfigs = reports.filter(r => r.isValid).length;
    const totalAllocations = reports.reduce((sum, r) => sum + r.totalAllocations, 0);
    const totalErrors = reports.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = reports.reduce((sum, r) => sum + r.warnings.length, 0);

    console.log('\n=== COMPREHENSIVE VALIDATION SUMMARY ===');
    console.log(`Total configs tested: ${totalConfigs}`);
    console.log(`Valid configs: ${validConfigs}/${totalConfigs}`);
    console.log(`Total allocations generated: ${totalAllocations}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total warnings: ${totalWarnings}`);
    console.log('=========================================\n');

    // Error breakdown by type
    const errorsByType = new Map<string, number>();
    reports.forEach(r => {
      r.errors.forEach(e => {
        errorsByType.set(e.type, (errorsByType.get(e.type) || 0) + 1);
      });
    });

    if (errorsByType.size > 0) {
      console.log('Error breakdown:');
      errorsByType.forEach((count, type) => {
        console.log(`  ${type}: ${count}`);
      });
    }

    // All fixture configs should be valid (no critical errors)
    expect(validConfigs).toBe(totalConfigs);
  });
});


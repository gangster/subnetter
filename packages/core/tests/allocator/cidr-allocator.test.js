import { CidrAllocator, AllocationError } from '../../src/index.js';
import { calculateOptimalPrefixLength, subdivideIpv4Cidr, calculateUsableIps, doCidrsOverlap, CidrError } from '../../src/allocator/cidr-calculator.js';
describe('CIDR Management Suite', () => {
    let validConfig;
    beforeEach(() => {
        // Set up a valid config for testing
        validConfig = {
            baseCidr: '10.0.0.0/8',
            prefixLengths: {
                account: 16,
                region: 20,
                az: 24
            },
            cloudProviders: ['aws', 'azure', 'gcp'],
            accounts: [
                {
                    name: 'test-account',
                    cloudConfigs: {
                        aws: {
                            provider: 'aws',
                            regions: ['us-east-1', 'us-west-2']
                        }
                    }
                }
            ],
            subnetTypes: [
                { name: 'Public', prefixLength: 26 },
                { name: 'Private', prefixLength: 26 }
            ]
        };
    });
    describe('CIDR Allocator', () => {
        describe('generateAllocations', () => {
            it('should generate correct number of allocations', () => {
                const allocator = new CidrAllocator(validConfig);
                const allocations = allocator.generateAllocations();
                // For each account (1), region (2), AZ (3 per region), and subnet type (2)
                // Total allocations = 1 account * 2 regions * 3 AZs * 2 subnet types = 12
                expect(allocations).toHaveLength(12);
            });
            it('should use account-specific CIDR when provided', () => {
                const configWithAccountCidr = {
                    ...validConfig,
                    accounts: [
                        {
                            name: 'innovation-test',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    regions: ['us-east-1'],
                                    baseCidr: '172.16.0.0/12'
                                }
                            }
                        }
                    ]
                };
                const allocator = new CidrAllocator(configWithAccountCidr);
                const allocations = allocator.generateAllocations();
                // Check that all allocations for this account use the account-specific CIDR
                expect(allocations[0].vpcCidr).toBe('172.16.0.0/12');
            });
            it('should correctly use prefix lengths from config', () => {
                const allocator = new CidrAllocator(validConfig);
                const allocations = allocator.generateAllocations();
                // Check that the AZ CIDR has the correct prefix length
                expect(allocations[0].azCidr.split('/')[1]).toBe('24');
                // Check that the subnet CIDR has the correct prefix length
                expect(allocations[0].subnetCidr.split('/')[1]).toBe('26');
            });
            it('should generate correct AZ names', () => {
                const allocator = new CidrAllocator(validConfig);
                const allocations = allocator.generateAllocations();
                // Find all allocations for 'us-east-1'
                const usEast1Allocations = allocations.filter(a => a.regionName === 'us-east-1');
                // Should have allocations for us-east-1a, us-east-1b, us-east-1c
                const azNames = usEast1Allocations.map(a => a.availabilityZone);
                expect(azNames).toContain('us-east-1a');
                expect(azNames).toContain('us-east-1b');
                expect(azNames).toContain('us-east-1c');
            });
            it('should correctly calculate usable IPs', () => {
                const allocator = new CidrAllocator(validConfig);
                const allocations = allocator.generateAllocations();
                // For a /26 subnet, there are 64 IPs, with 62 usable (excluding network and broadcast)
                allocations.forEach(allocation => {
                    if (allocation.subnetCidr.endsWith('/26')) {
                        expect(allocation.usableIps).toBe(62);
                    }
                });
            });
            it('should throw AllocationError when not enough space for regions', () => {
                const invalidConfig = {
                    ...validConfig,
                    prefixLengths: {
                        account: 16,
                        region: 30 // Too small for multiple regions
                    },
                    accounts: [
                        {
                            name: 'innovation-test',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    regions: ['us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1']
                                }
                            }
                        }
                    ]
                };
                const allocator = new CidrAllocator(invalidConfig);
                expect(() => allocator.generateAllocations()).toThrow(AllocationError);
            });
            it('should throw AllocationError when not enough space for subnets', () => {
                const invalidConfig = {
                    ...validConfig,
                    prefixLengths: {
                        account: 16,
                        region: 20,
                        az: 30 // Too small for multiple subnets
                    },
                    subnetTypes: [
                        { name: 'Public', prefixLength: 24 },
                        { name: 'Private', prefixLength: 24 },
                        { name: 'Data', prefixLength: 24 },
                        { name: 'Management', prefixLength: 24 },
                        { name: 'Storage', prefixLength: 24 },
                        { name: 'DMZ', prefixLength: 24 },
                        { name: 'VPN', prefixLength: 24 },
                        { name: 'API', prefixLength: 24 }
                    ]
                };
                const allocator = new CidrAllocator(invalidConfig);
                expect(() => allocator.generateAllocations()).toThrow(AllocationError);
            });
            it('should handle cloud-specific configurations', () => {
                const configWithCloudConfigs = {
                    baseCidr: '10.0.0.0/8',
                    prefixLengths: {
                        region: 20,
                        az: 24
                    },
                    cloudProviders: ['aws', 'azure', 'gcp'],
                    accounts: [
                        {
                            name: 'multi-cloud-account',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    baseCidr: '10.0.0.0/16',
                                    regions: ['us-east-1', 'us-west-2']
                                },
                                azure: {
                                    provider: 'azure',
                                    baseCidr: '10.1.0.0/16',
                                    regions: ['eastus', 'westus2']
                                }
                            }
                        }
                    ],
                    subnetTypes: [
                        { name: 'Public', prefixLength: 26 },
                        { name: 'Private', prefixLength: 27 }
                    ]
                };
                const allocator = new CidrAllocator(configWithCloudConfigs);
                const allocations = allocator.generateAllocations();
                // 2 providers × 2 regions × 3 AZs × 2 subnet types = 24 allocations
                expect(allocations.length).toBe(24);
                // Verify AWS allocations
                const awsAllocations = allocations.filter(a => a.cloudProvider === 'aws');
                expect(awsAllocations.length).toBe(12);
                expect(awsAllocations[0].vpcCidr).toBe('10.0.0.0/16');
                // Verify Azure allocations
                const azureAllocations = allocations.filter(a => a.cloudProvider === 'azure');
                expect(azureAllocations.length).toBe(12);
                expect(azureAllocations[0].vpcCidr).toBe('10.1.0.0/16');
            });
            it('should generate allocations for a valid configuration', () => {
                const config = {
                    baseCidr: '10.0.0.0/8',
                    prefixLengths: {
                        region: 16,
                        az: 20
                    },
                    cloudProviders: ['aws', 'azure', 'gcp'],
                    accounts: [
                        {
                            name: 'test-account',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    regions: ['us-east-1', 'us-west-1']
                                },
                                azure: {
                                    provider: 'azure',
                                    regions: ['eastus', 'westus']
                                },
                                gcp: {
                                    provider: 'gcp',
                                    regions: ['us-east1', 'us-west1']
                                }
                            }
                        }
                    ],
                    subnetTypes: [
                        { name: 'Public', prefixLength: 24 },
                        { name: 'Private', prefixLength: 25 },
                        { name: 'Data', prefixLength: 26 }
                    ]
                };
                const allocator = new CidrAllocator(config);
                const allocations = allocator.generateAllocations();
                expect(allocations.length).toBeGreaterThan(0);
                expect(allocations[0].cidr).toBeDefined();
            });
            it('should generate allocations for a configuration with account-specific CIDR', () => {
                const config = {
                    baseCidr: '10.0.0.0/8',
                    prefixLengths: {
                        region: 16,
                        az: 20
                    },
                    cloudProviders: ['aws'],
                    accounts: [
                        {
                            name: 'test-account',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    regions: ['us-east-1', 'us-west-1'],
                                    baseCidr: '10.0.0.0/12'
                                }
                            }
                        }
                    ],
                    subnetTypes: [
                        { name: 'Public', prefixLength: 24 },
                        { name: 'Private', prefixLength: 25 },
                        { name: 'Data', prefixLength: 26 }
                    ]
                };
                const allocator = new CidrAllocator(config);
                const allocations = allocator.generateAllocations();
                expect(allocations.length).toBeGreaterThan(0);
                expect(allocations[0].cidr).toBeDefined();
                expect(allocations[0].cidr).toContain('10.0.');
            });
            it('should support subnet-type-specific prefix lengths', () => {
                // Create a config with subnet-type-specific prefix lengths
                const configWithSubnetPrefixes = {
                    baseCidr: '10.0.0.0/8',
                    prefixLengths: {
                        account: 16,
                        region: 20,
                        az: 22
                    },
                    subnetTypes: [
                        { name: 'Public', prefixLength: 24 },
                        { name: 'Private', prefixLength: 25 },
                        { name: 'Data', prefixLength: 26 },
                        { name: 'Management', prefixLength: 27 }
                    ],
                    cloudProviders: ['aws'],
                    accounts: [
                        {
                            name: 'test-account',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    regions: ['us-east-1']
                                }
                            }
                        }
                    ]
                };
                const allocator = new CidrAllocator(configWithSubnetPrefixes);
                const allocations = allocator.generateAllocations();
                // Should have allocations for all subnet types
                expect(allocations.length).toBe(12); // 1 account * 1 region * 3 AZs * 4 subnet types
                // Group allocations by subnet type
                const publicSubnets = allocations.filter(a => a.subnetRole === 'Public');
                const privateSubnets = allocations.filter(a => a.subnetRole === 'Private');
                const dataSubnets = allocations.filter(a => a.subnetRole === 'Data');
                const mgmtSubnets = allocations.filter(a => a.subnetRole === 'Management');
                // Verify prefix lengths by checking the CIDR notation
                publicSubnets.forEach(subnet => {
                    expect(subnet.subnetCidr).toMatch(/\/24$/);
                    expect(calculateUsableIps(subnet.subnetCidr)).toBe(254);
                });
                privateSubnets.forEach(subnet => {
                    expect(subnet.subnetCidr).toMatch(/\/25$/);
                    expect(calculateUsableIps(subnet.subnetCidr)).toBe(126);
                });
                dataSubnets.forEach(subnet => {
                    expect(subnet.subnetCidr).toMatch(/\/26$/);
                    expect(calculateUsableIps(subnet.subnetCidr)).toBe(62);
                });
                mgmtSubnets.forEach(subnet => {
                    expect(subnet.subnetCidr).toMatch(/\/27$/);
                    expect(calculateUsableIps(subnet.subnetCidr)).toBe(30);
                });
                // Verify that subnets don't overlap within an AZ
                for (let i = 0; i < allocations.length; i++) {
                    for (let j = i + 1; j < allocations.length; j++) {
                        if (allocations[i].availabilityZone === allocations[j].availabilityZone) {
                            expect(doCidrsOverlap(allocations[i].subnetCidr, allocations[j].subnetCidr)).toBe(false);
                        }
                    }
                }
            });
            it('should use subnet-specific prefix lengths', () => {
                const configWithSubnetPrefixes = {
                    baseCidr: '10.0.0.0/8',
                    prefixLengths: {
                        region: 16,
                        az: 20
                    },
                    subnetTypes: [
                        { name: 'Public', prefixLength: 24 },
                        { name: 'Private', prefixLength: 26 },
                        { name: 'Data', prefixLength: 28 }
                    ],
                    cloudProviders: ['aws'],
                    accounts: [
                        {
                            name: 'test-account',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    regions: ['us-east-1']
                                }
                            }
                        }
                    ]
                };
                const allocator = new CidrAllocator(configWithSubnetPrefixes);
                const allocations = allocator.generateAllocations();
                // Find allocations for each subnet type
                const publicSubnet = allocations.find(a => a.subnetRole === 'Public');
                const privateSubnet = allocations.find(a => a.subnetRole === 'Private');
                const dataSubnet = allocations.find(a => a.subnetRole === 'Data');
                // Check that each subnet has the correct prefix length
                expect(publicSubnet?.subnetCidr.split('/')[1]).toBe('24');
                expect(privateSubnet?.subnetCidr.split('/')[1]).toBe('26');
                expect(dataSubnet?.subnetCidr.split('/')[1]).toBe('28');
            });
            it('should handle subnet allocation with default prefix lengths', () => {
                // Create a minimal config without explicit prefix lengths
                const minimalConfig = {
                    baseCidr: '10.0.0.0/8',
                    cloudProviders: ['aws'],
                    accounts: [
                        {
                            name: 'test-account',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    regions: ['us-east-1']
                                }
                            }
                        }
                    ],
                    subnetTypes: [
                        { name: 'Public', prefixLength: 24 },
                        { name: 'Private', prefixLength: 24 }
                    ]
                };
                const allocator = new CidrAllocator(minimalConfig);
                const allocations = allocator.generateAllocations();
                expect(allocations.length).toBe(6); // 1 account * 1 region * 3 AZs * 2 subnet types
                // Verify that the allocations have the correct properties
                allocations.forEach(allocation => {
                    expect(allocation).toHaveProperty('accountName', 'test-account');
                    expect(allocation).toHaveProperty('cloudProvider', 'aws');
                    expect(allocation).toHaveProperty('regionName', 'us-east-1');
                });
            });
        });
    });
    describe('CIDR Calculator', () => {
        describe('calculateUsableIps', () => {
            it('should calculate correct number of usable IPs for normal subnets', () => {
                expect(calculateUsableIps('192.168.1.0/24')).toBe(254); // 256 - 2
                expect(calculateUsableIps('10.0.0.0/8')).toBe(16777214); // 2^24 - 2
                expect(calculateUsableIps('192.168.1.0/28')).toBe(14); // 16 - 2
            });
            it('should handle special cases correctly', () => {
                expect(calculateUsableIps('192.168.1.0/31')).toBe(2); // Point-to-point
                expect(calculateUsableIps('192.168.1.0/32')).toBe(1); // Single host
            });
            it('should throw for invalid CIDR', () => {
                expect(() => calculateUsableIps('invalid')).toThrow(CidrError);
                expect(() => calculateUsableIps('192.168.1.0/33')).toThrow(CidrError);
            });
        });
        describe('doCidrsOverlap', () => {
            it('should detect overlapping CIDRs', () => {
                // Same network
                expect(doCidrsOverlap('192.168.1.0/24', '192.168.1.0/24')).toBe(true);
                // One is subnet of the other
                expect(doCidrsOverlap('10.0.0.0/8', '10.10.0.0/16')).toBe(true);
                expect(doCidrsOverlap('10.10.0.0/16', '10.0.0.0/8')).toBe(true);
                // Partially overlapping
                expect(doCidrsOverlap('192.168.1.0/24', '192.168.1.128/25')).toBe(true);
            });
            it('should detect non-overlapping CIDRs', () => {
                // Different networks
                expect(doCidrsOverlap('192.168.1.0/24', '192.168.2.0/24')).toBe(false);
                expect(doCidrsOverlap('10.0.0.0/8', '172.16.0.0/12')).toBe(false);
                // Adjacent networks
                expect(doCidrsOverlap('192.168.1.0/25', '192.168.1.128/25')).toBe(false);
            });
            it('should throw for invalid CIDRs', () => {
                expect(() => doCidrsOverlap('invalid', '192.168.1.0/24')).toThrow(CidrError);
                expect(() => doCidrsOverlap('192.168.1.0/24', 'invalid')).toThrow(CidrError);
            });
        });
        describe('subdivideIpv4Cidr', () => {
            it('should correctly subdivide IPv4 CIDR blocks', () => {
                const subnets = subdivideIpv4Cidr('192.168.1.0/24', 26);
                expect(subnets).toHaveLength(4); // 2^(26-24) = 4 subnets
                expect(subnets).toContain('192.168.1.0/26');
                expect(subnets).toContain('192.168.1.64/26');
                expect(subnets).toContain('192.168.1.128/26');
                expect(subnets).toContain('192.168.1.192/26');
            });
            it('should handle larger networks correctly', () => {
                const subnets = subdivideIpv4Cidr('10.0.0.0/8', 10);
                expect(subnets).toHaveLength(4); // 2^(10-8) = 4 subnets
                expect(subnets).toContain('10.0.0.0/10');
                expect(subnets).toContain('10.64.0.0/10');
                expect(subnets).toContain('10.128.0.0/10');
                expect(subnets).toContain('10.192.0.0/10');
            });
            it('should throw when new prefix is less than current', () => {
                expect(() => subdivideIpv4Cidr('192.168.1.0/24', 20)).toThrow(CidrError);
            });
            it('should return the original CIDR when new prefix equals current', () => {
                const result = subdivideIpv4Cidr('192.168.1.0/24', 24);
                expect(result).toEqual(['192.168.1.0/24']);
            });
            it('should throw when new prefix exceeds 32', () => {
                expect(() => subdivideIpv4Cidr('192.168.1.0/24', 33)).toThrow(CidrError);
            });
            it('should throw for invalid CIDR', () => {
                expect(() => subdivideIpv4Cidr('invalid', 26)).toThrow(CidrError);
            });
        });
        describe('calculateOptimalPrefixLength', () => {
            it('should calculate optimal prefix length for subnet count', () => {
                expect(calculateOptimalPrefixLength('192.168.1.0/24', 4)).toBe(26); // 24 + 2 = 26
                expect(calculateOptimalPrefixLength('10.0.0.0/8', 16)).toBe(12); // 8 + 4 = 12
            });
            it('should handle edge cases correctly', () => {
                expect(calculateOptimalPrefixLength('192.168.1.0/24', 1)).toBe(24); // No change needed
                expect(calculateOptimalPrefixLength('192.168.1.0/30', 2)).toBe(31); // 30 + 1 = 31
            });
            it('should throw when subnet count cannot be accommodated', () => {
                expect(() => calculateOptimalPrefixLength('192.168.1.0/30', 16)).toThrow(CidrError);
            });
            it('should throw for invalid CIDR', () => {
                expect(() => calculateOptimalPrefixLength('invalid', 4)).toThrow(CidrError);
            });
        });
    });
    describe('Cloud Configuration Model', () => {
        it('should handle cloud-specific configurations in accounts', () => {
            const account = {
                name: 'innovation-prod',
                cloudConfigs: {
                    aws: {
                        provider: 'aws',
                        baseCidr: '10.103.0.0/16',
                        regions: ['us-east-1', 'us-west-2']
                    },
                    azure: {
                        provider: 'azure',
                        baseCidr: '172.16.0.0/16',
                        regions: ['eastus', 'westeurope']
                    }
                }
            };
            expect(account.name).toBe('innovation-prod');
            expect(account.cloudConfigs).toBeDefined();
            if (!account.cloudConfigs) {
                fail('cloudConfigs should be defined');
                return;
            }
            // Test AWS config
            expect(account.cloudConfigs.aws.provider).toBe('aws');
            expect(account.cloudConfigs.aws.baseCidr).toBe('10.103.0.0/16');
            expect(account.cloudConfigs.aws.regions).toContain('us-east-1');
            // Test Azure config
            expect(account.cloudConfigs.azure.provider).toBe('azure');
            expect(account.cloudConfigs.azure.baseCidr).toBe('172.16.0.0/16');
        });
        it('should create a valid configuration with cloud-specific settings', () => {
            const config = {
                baseCidr: '10.0.0.0/8',
                cloudProviders: ['aws', 'azure', 'gcp'],
                accounts: [
                    {
                        name: 'innovation-prod',
                        cloudConfigs: {
                            aws: {
                                provider: 'aws',
                                baseCidr: '10.103.0.0/16',
                                regions: ['us-east-1', 'us-west-2']
                            },
                            azure: {
                                provider: 'azure',
                                baseCidr: '172.16.0.0/16',
                                regions: ['eastus', 'westeurope']
                            }
                        }
                    },
                    {
                        name: 'innovation-test',
                        cloudConfigs: {
                            aws: {
                                provider: 'aws',
                                baseCidr: '10.101.0.0/16',
                                regions: ['us-east-1', 'eu-west-1']
                            }
                        }
                    }
                ],
                subnetTypes: [
                    { name: 'Public', prefixLength: 24 },
                    { name: 'Private', prefixLength: 24 },
                    { name: 'Data', prefixLength: 24 }
                ]
            };
            expect(config.accounts.length).toBe(2);
            // Test the first account (cloud-specific)
            const cloudAccount = config.accounts[0];
            expect(cloudAccount.name).toBe('innovation-prod');
            if (!cloudAccount.cloudConfigs) {
                fail('cloudConfigs should be defined');
                return;
            }
            expect(Object.keys(cloudAccount.cloudConfigs).length).toBe(2);
            // Test the second account
            const secondAccount = config.accounts[1];
            expect(secondAccount.name).toBe('innovation-test');
            expect(secondAccount.cloudConfigs.aws.baseCidr).toBe('10.101.0.0/16');
            expect(secondAccount.cloudConfigs.aws.regions).toContain('us-east-1');
        });
        it('should support cloud-specific account format', () => {
            const account = {
                name: 'innovation-prod',
                cloudConfigs: {
                    aws: {
                        provider: 'aws',
                        baseCidr: '10.103.0.0/16',
                        regions: ['us-east-1', 'us-west-2']
                    },
                    azure: {
                        provider: 'azure',
                        baseCidr: '172.16.0.0/16',
                        regions: ['eastus', 'westeurope']
                    }
                }
            };
            expect(account.name).toBe('innovation-prod');
            expect(account.cloudConfigs).toBeDefined();
            if (!account.cloudConfigs) {
                fail('cloudConfigs should be defined');
                return;
            }
            // Test AWS config
            expect(account.cloudConfigs.aws.provider).toBe('aws');
            expect(account.cloudConfigs.aws.baseCidr).toBe('10.103.0.0/16');
            expect(account.cloudConfigs.aws.regions).toContain('us-east-1');
            // Test Azure config
            expect(account.cloudConfigs.azure.provider).toBe('azure');
            expect(account.cloudConfigs.azure.baseCidr).toBe('172.16.0.0/16');
        });
        it('should create a valid configuration with cloud-specific settings', () => {
            const config = {
                baseCidr: '10.0.0.0/8',
                cloudProviders: ['aws', 'azure', 'gcp'],
                accounts: [
                    {
                        name: 'innovation-prod',
                        cloudConfigs: {
                            aws: {
                                provider: 'aws',
                                baseCidr: '10.103.0.0/16',
                                regions: ['us-east-1', 'us-west-2']
                            },
                            azure: {
                                provider: 'azure',
                                baseCidr: '172.16.0.0/16',
                                regions: ['eastus', 'westeurope']
                            }
                        }
                    },
                    {
                        name: 'innovation-test',
                        cloudConfigs: {
                            aws: {
                                provider: 'aws',
                                baseCidr: '10.101.0.0/16',
                                regions: ['us-east-1', 'eu-west-1']
                            }
                        }
                    }
                ],
                subnetTypes: [
                    { name: 'Public', prefixLength: 24 },
                    { name: 'Private', prefixLength: 24 },
                    { name: 'Data', prefixLength: 24 }
                ]
            };
            expect(config.accounts.length).toBe(2);
            // Test the first account (cloud-specific)
            const cloudAccount = config.accounts[0];
            expect(cloudAccount.name).toBe('innovation-prod');
            if (!cloudAccount.cloudConfigs) {
                fail('cloudConfigs should be defined');
                return;
            }
            expect(Object.keys(cloudAccount.cloudConfigs).length).toBe(2);
            // Test the second account
            const secondAccount = config.accounts[1];
            expect(secondAccount.name).toBe('innovation-test');
            expect(secondAccount.cloudConfigs.aws.baseCidr).toBe('10.101.0.0/16');
            expect(secondAccount.cloudConfigs.aws.regions).toContain('us-east-1');
        });
    });
});

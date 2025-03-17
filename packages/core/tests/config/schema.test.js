import { configSchema, accountSchema, cloudConfigSchema } from '../../src/config/schema.js';
describe('Configuration Schema Validation', () => {
    describe('Base Schema', () => {
        it('should validate a correct configuration', () => {
            const validConfig = {
                baseCidr: '10.0.0.0/8',
                prefixLengths: {
                    account: 16,
                    region: 20,
                    az: 24
                },
                cloudProviders: ['aws', 'azure', 'gcp'],
                accounts: [
                    {
                        name: 'innovation-test',
                        cloudConfigs: {
                            aws: {
                                provider: 'aws',
                                regions: ['us-east-1', 'eu-west-1']
                            }
                        }
                    }
                ],
                subnetTypes: [
                    { name: 'Public', prefixLength: 28 },
                    { name: 'Private', prefixLength: 26 },
                    { name: 'Data', prefixLength: 27 },
                    { name: 'Management', prefixLength: 28 }
                ]
            };
            const result = configSchema.safeParse(validConfig);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(validConfig);
            }
        });
        it('should validate a configuration with account-specific CIDR', () => {
            const validConfig = {
                baseCidr: '10.0.0.0/8',
                cloudProviders: ['aws'],
                accounts: [
                    {
                        name: 'innovation-prod',
                        cloudConfigs: {
                            aws: {
                                provider: 'aws',
                                regions: ['us-east-1', 'us-west-2'],
                                baseCidr: '172.16.0.0/12'
                            }
                        }
                    }
                ],
                subnetTypes: [
                    { name: 'Public', prefixLength: 28 },
                    { name: 'Private', prefixLength: 26 }
                ]
            };
            const result = configSchema.safeParse(validConfig);
            expect(result.success).toBe(true);
        });
        it('should reject invalid IPv4 CIDR format', () => {
            const invalidConfig = {
                baseCidr: '10.0.0.0/33', // Invalid prefix length
                cloudProviders: ['aws'],
                accounts: [{ name: 'innovation-test', regions: ['us-east-1'] }],
                subnetTypes: [
                    { name: 'Public', prefixLength: 28 }
                ]
            };
            const result = configSchema.safeParse(invalidConfig);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Invalid IPv4 CIDR format');
            }
        });
        it('should accept any valid account name', () => {
            const configs = [
                {
                    baseCidr: '10.0.0.0/8',
                    cloudProviders: ['aws'],
                    accounts: [
                        {
                            name: 'innovation-test',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    regions: ['us-east-1']
                                }
                            }
                        }
                    ],
                    subnetTypes: [
                        { name: 'Public', prefixLength: 28 }
                    ]
                },
                {
                    baseCidr: '10.0.0.0/8',
                    cloudProviders: ['aws'],
                    accounts: [
                        {
                            name: 'finance_dept',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    regions: ['us-east-1']
                                }
                            }
                        }
                    ],
                    subnetTypes: [
                        { name: 'Public', prefixLength: 28 }
                    ]
                },
                {
                    baseCidr: '10.0.0.0/8',
                    cloudProviders: ['aws'],
                    accounts: [
                        {
                            name: 'dev123',
                            cloudConfigs: {
                                aws: {
                                    provider: 'aws',
                                    regions: ['us-east-1']
                                }
                            }
                        }
                    ],
                    subnetTypes: [
                        { name: 'Public', prefixLength: 28 }
                    ]
                }
            ];
            configs.forEach(config => {
                const result = configSchema.safeParse(config);
                expect(result.success).toBe(true);
            });
        });
        it('should reject account names that are empty or only whitespace', () => {
            const invalidConfigs = [
                {
                    baseCidr: '10.0.0.0/8',
                    cloudProviders: ['aws'],
                    accounts: [{ name: '', regions: ['us-east-1'] }],
                    subnetTypes: [
                        { name: 'Public', prefixLength: 28 }
                    ]
                },
                {
                    baseCidr: '10.0.0.0/8',
                    cloudProviders: ['aws'],
                    accounts: [{ name: '   ', regions: ['us-east-1'] }],
                    subnetTypes: [
                        { name: 'Public', prefixLength: 28 }
                    ]
                }
            ];
            invalidConfigs.forEach(config => {
                const result = configSchema.safeParse(config);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].path).toContain('accounts');
                }
            });
        });
        it('should reject invalid prefix lengths', () => {
            const invalidConfig = {
                baseCidr: '10.0.0.0/8',
                prefixLengths: {
                    account: 33, // Invalid: must be 1-32
                    region: 20
                },
                cloudProviders: ['aws'],
                accounts: [{ name: 'innovation-test', regions: ['us-east-1'] }],
                subnetTypes: [
                    { name: 'Public', prefixLength: 28 }
                ]
            };
            const result = configSchema.safeParse(invalidConfig);
            expect(result.success).toBe(false);
        });
        it('should validate subnet types as objects with name and prefixLength', () => {
            const validConfig = {
                baseCidr: '10.0.0.0/8',
                cloudProviders: ['aws'],
                accounts: [
                    {
                        name: 'innovation-test',
                        cloudConfigs: {
                            aws: {
                                provider: 'aws',
                                regions: ['us-east-1']
                            }
                        }
                    }
                ],
                subnetTypes: [
                    { name: 'Public', prefixLength: 28 },
                    { name: 'Private', prefixLength: 26 }
                ]
            };
            const result = configSchema.safeParse(validConfig);
            expect(result.success).toBe(true);
        });
        it('should reject subnet types without required properties', () => {
            const invalidConfig = {
                baseCidr: '10.0.0.0/8',
                cloudProviders: ['aws'],
                accounts: [{ name: 'innovation-test', regions: ['us-east-1'] }],
                subnetTypes: [
                    { name: 'Public', prefixLength: 28 },
                    { prefixLength: 26 } // Missing name
                ]
            };
            const result = configSchema.safeParse(invalidConfig);
            expect(result.success).toBe(false);
        });
    });
    describe('Cloud-Specific Schema', () => {
        describe('cloudConfigSchema', () => {
            it('should validate a valid cloud configuration', () => {
                const validCloudConfig = {
                    provider: 'aws',
                    baseCidr: '10.0.0.0/8',
                    regions: ['us-east-1', 'us-west-2']
                };
                const result = cloudConfigSchema.safeParse(validCloudConfig);
                expect(result.success).toBe(true);
            });
            it('should validate a cloud configuration without baseCidr', () => {
                const validCloudConfig = {
                    provider: 'aws',
                    regions: ['us-east-1', 'us-west-2']
                };
                const result = cloudConfigSchema.safeParse(validCloudConfig);
                expect(result.success).toBe(true);
            });
            it('should reject invalid cloud configuration', () => {
                const invalidCloudConfig = {
                    provider: 'aws',
                    baseCidr: '10.0.0.0/38', // Invalid CIDR
                    regions: ['us-east-1']
                };
                const result = cloudConfigSchema.safeParse(invalidCloudConfig);
                expect(result.success).toBe(false);
            });
        });
        describe('accountSchema', () => {
            it('should validate an account with cloud configs', () => {
                const cloudAccount = {
                    name: 'innovation-prod',
                    cloudConfigs: {
                        aws: {
                            provider: 'aws',
                            regions: ['us-east-1', 'us-west-2']
                        },
                        azure: {
                            provider: 'azure',
                            regions: ['eastus', 'westeurope'],
                            baseCidr: '172.16.0.0/12'
                        }
                    }
                };
                const result = accountSchema.safeParse(cloudAccount);
                expect(result.success).toBe(true);
            });
            it('should reject an account with neither regions nor cloudConfigs', () => {
                const invalidAccount = {
                    name: 'invalid-account'
                };
                const result = accountSchema.safeParse(invalidAccount);
                expect(result.success).toBe(false);
            });
        });
        it('should validate a configuration with mixed account formats', () => {
            const mixedConfig = {
                baseCidr: '10.0.0.0/8',
                cloudProviders: ['aws', 'azure'],
                accounts: [
                    {
                        name: 'cloud-account',
                        cloudConfigs: {
                            aws: {
                                provider: 'aws',
                                regions: ['us-east-1', 'us-west-2']
                            },
                            azure: {
                                provider: 'azure',
                                regions: ['eastus', 'westeurope'],
                                baseCidr: '172.16.0.0/12'
                            }
                        }
                    }
                ],
                subnetTypes: [
                    { name: 'Public', prefixLength: 28 },
                    { name: 'Private', prefixLength: 26 }
                ]
            };
            const result = configSchema.safeParse(mixedConfig);
            expect(result.success).toBe(true);
        });
    });
});

import { configSchema } from '../../src/config/schema.js';
describe('Account Name Validation', () => {
    it('should accept account names without innovation- prefix', () => {
        const configs = [
            {
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
                    { name: 'Public', prefixLength: 28 }
                ]
            },
            {
                baseCidr: '10.0.0.0/8',
                cloudProviders: ['aws'],
                accounts: [
                    {
                        name: 'acme-corp',
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
                        name: 'customer123',
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
    it('should still reject empty account names', () => {
        const invalidConfigs = [
            {
                baseCidr: '10.0.0.0/8',
                cloudProviders: ['aws'],
                accounts: [
                    {
                        name: '',
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
                        name: '   ',
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
        invalidConfigs.forEach(config => {
            const result = configSchema.safeParse(config);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Account name cannot be empty');
            }
        });
    });
});

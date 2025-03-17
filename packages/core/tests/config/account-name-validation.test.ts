import { configSchema } from '../../src/config/schema';

describe('Account Name Validation', () => {
  it('should accept account names without innovation- prefix', () => {
    const configs = [
      {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws'],
        accounts: [
          { 
            name: 'test-account', 
            clouds: {
              aws: {
                regions: ['us-east-1']
              }
            }
          }
        ],
        subnetTypes: {
          Public: 28
        }
      },
      {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws'],
        accounts: [
          { 
            name: 'acme-corp', 
            clouds: {
              aws: {
                regions: ['us-east-1']
              }
            }
          }
        ],
        subnetTypes: {
          Public: 28
        }
      },
      {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws'],
        accounts: [
          { 
            name: 'customer123', 
            clouds: {
              aws: {
                regions: ['us-east-1']
              }
            }
          }
        ],
        subnetTypes: {
          Public: 28
        }
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
            clouds: {
              aws: {
                regions: ['us-east-1']
              }
            }
          }
        ],
        subnetTypes: {
          Public: 28
        }
      },
      {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws'],
        accounts: [
          { 
            name: '   ', 
            clouds: {
              aws: {
                regions: ['us-east-1']
              }
            }
          }
        ],
        subnetTypes: {
          Public: 28
        }
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
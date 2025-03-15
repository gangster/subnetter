import { configSchema, accountSchema, cloudConfigSchema } from '../../src/config/schema';

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
            clouds: {
              aws: {
                regions: ['us-east-1', 'eu-west-1']
              }
            }
          }
        ],
        subnetTypes: {
          Public: 28,
          Private: 26,
          Data: 27,
          Management: 28
        }
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
            clouds: {
              aws: {
                regions: ['us-east-1', 'us-west-2'],
                baseCidr: '172.16.0.0/12'
              }
            }
          }
        ],
        subnetTypes: {
          Public: 28,
          Private: 26
        }
      };

      const result = configSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid IPv4 CIDR format', () => {
      const invalidConfig = {
        baseCidr: '10.0.0.0/33', // Invalid prefix length
        cloudProviders: ['aws'],
        accounts: [{ name: 'innovation-test', regions: ['us-east-1'] }],
        subnetTypes: {
          Public: 28
        }
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
              name: 'finance_dept', 
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
              name: 'dev123', 
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

    it('should reject account names that are empty or only whitespace', () => {
      const invalidConfigs = [
        {
          baseCidr: '10.0.0.0/8',
          cloudProviders: ['aws'],
          accounts: [{ name: '', regions: ['us-east-1'] }],
          subnetTypes: {
            Public: 28
          }
        },
        {
          baseCidr: '10.0.0.0/8',
          cloudProviders: ['aws'],
          accounts: [{ name: '   ', regions: ['us-east-1'] }],
          subnetTypes: {
            Public: 28
          }
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
        subnetTypes: {
          Public: 28
        }
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
            clouds: {
              aws: {
                regions: ['us-east-1']
              }
            }
          }
        ],
        subnetTypes: {
          Public: 28,
          Private: 26
        }
      };

      const result = configSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject subnet types without required properties', () => {
      const invalidConfig = {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws'],
        accounts: [{ name: 'innovation-test', regions: ['us-east-1'] }],
        subnetTypes: {
          "": 28  // Empty string as key
        }
      };

      const result = configSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        const hasSubnetTypesError = result.error.issues.some(issue => 
          issue.path.includes('subnetTypes'));
        expect(hasSubnetTypesError).toBe(true);
      }
    });

    it('should accept any valid IPv4 CIDR format', () => {
      const validConfig = {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws'],
        accounts: [
          { 
            name: 'innovation-test', 
            clouds: {
              aws: {
                regions: ['us-east-1']
              }
            }
          }
        ],
        subnetTypes: {
          Public: 28,
          Private: 26
        }
      };

      const result = configSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject subnet types with invalid prefix lengths', () => {
      const invalidConfig = {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws'],
        accounts: [{ name: 'innovation-test', regions: ['us-east-1'] }],
        subnetTypes: {
          Public: 28,
          Invalid: 33  // Higher than max allowed (32)
        }
      };

      const result = configSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        const hasSubnetTypesError = result.error.issues.some(issue => 
          issue.path.includes('subnetTypes'));
        expect(hasSubnetTypesError).toBe(true);
        
        const hasNumberError = result.error.issues.some(issue => 
          issue.message.includes('Number must be less than or equal to 32'));
        expect(hasNumberError).toBe(true);
      }
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
          clouds: {
            aws: {
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

      it('should reject an account with neither regions nor clouds', () => {
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
            clouds: {
              aws: {
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
        subnetTypes: {
          Public: 28,
          Private: 26
        }
      };

      const result = configSchema.safeParse(mixedConfig);
      expect(result.success).toBe(true);
    });
  });
}); 
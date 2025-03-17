import { 
  CloudProvider, 
  Account, 
  Allocation,
  Config 
} from '../../src/models/types';

describe('Domain Models', () => {
  describe('CloudProvider', () => {
    it('should create a valid CloudProvider', () => {
      const provider: CloudProvider = {
        name: 'aws',
        regions: ['us-east-1', 'us-west-2']
      };
      
      expect(provider.name).toBe('aws');
      expect(provider.regions).toHaveLength(2);
      expect(provider.regions).toContain('us-east-1');
    });
  });
  
  describe('Account', () => {
    it('should create a valid Account with cloud configs', () => {
      const account: Account = {
        name: 'innovation-test',
        clouds: {
          aws: {
            regions: ['us-east-1']
          }
        }
      };
      
      expect(account.name).toBe('innovation-test');
      expect(account.clouds.aws.regions).toHaveLength(1);
    });
    
    it('should create an Account with multiple cloud providers', () => {
      const account: Account = {
        name: 'innovation-prod',
        clouds: {
          aws: {
            regions: ['us-east-1', 'us-west-2'],
            baseCidr: '10.0.0.0/12'
          },
          azure: {
            regions: ['eastus', 'westeurope'],
            baseCidr: '172.16.0.0/12'
          }
        }
      };
      
      expect(account.clouds.aws.baseCidr).toBe('10.0.0.0/12');
      expect(account.clouds.azure.regions).toContain('eastus');
    });
  });
  
  describe('Allocation', () => {
    it('should create a valid Allocation', () => {
      const allocation: Allocation = {
        accountName: 'innovation-test',
        vpcName: 'innovation-test-vpc',
        cloudProvider: 'aws',
        regionName: 'us-east-1',
        availabilityZone: 'us-east-1a',
        regionCidr: '10.0.0.0/20',
        vpcCidr: '10.0.0.0/16',
        azCidr: '10.0.0.0/24',
        subnetCidr: '10.0.0.0/28',
        subnetRole: 'Public',
        usableIps: 14
      };
      
      expect(allocation.accountName).toBe('innovation-test');
      expect(allocation.subnetCidr).toBe('10.0.0.0/28');
      expect(allocation.usableIps).toBe(14);
    });
  });
  
  describe('Config', () => {
    it('should create a valid Config', () => {
      const config: Config = {
        baseCidr: '10.0.0.0/8',
        prefixLengths: {
          account: 16,
          region: 20,
          az: 24
        },
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
          'Public': 28,
          'Private': 26
        }
      };
      
      expect(config.baseCidr).toBe('10.0.0.0/8');
      expect(config.accounts).toHaveLength(1);
      expect(config.cloudProviders).toContain('aws');
    });
    
    it('should create a Config with minimal required properties', () => {
      const config: Config = {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws'],
        accounts: [],
        subnetTypes: {}
      };
      
      expect(config.baseCidr).toBe('10.0.0.0/8');
      expect(config.prefixLengths).toBeUndefined();
    });
  });
}); 
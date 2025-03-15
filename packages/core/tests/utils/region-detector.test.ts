import { CloudProvider, detectCloudProviderFromRegion } from '../../src/utils/region-detector';

describe('Region Detector', () => {
  describe('detectCloudProviderFromRegion', () => {
    describe('AWS Regions', () => {
      it('should detect standard AWS regions', () => {
        expect(detectCloudProviderFromRegion('us-east-1')).toBe(CloudProvider.AWS);
        expect(detectCloudProviderFromRegion('us-west-2')).toBe(CloudProvider.AWS);
        expect(detectCloudProviderFromRegion('eu-central-1')).toBe(CloudProvider.AWS);
        expect(detectCloudProviderFromRegion('ap-northeast-1')).toBe(CloudProvider.AWS);
        expect(detectCloudProviderFromRegion('sa-east-1')).toBe(CloudProvider.AWS);
        expect(detectCloudProviderFromRegion('af-south-1')).toBe(CloudProvider.AWS);
        expect(detectCloudProviderFromRegion('ca-central-1')).toBe(CloudProvider.AWS);
      });

      it('should detect AWS GovCloud regions', () => {
        expect(detectCloudProviderFromRegion('us-gov-east-1')).toBe(CloudProvider.AWS);
        expect(detectCloudProviderFromRegion('us-gov-west-1')).toBe(CloudProvider.AWS);
      });

      it('should detect AWS China regions', () => {
        expect(detectCloudProviderFromRegion('cn-north-1')).toBe(CloudProvider.AWS);
        expect(detectCloudProviderFromRegion('cn-northwest-1')).toBe(CloudProvider.AWS);
      });
    });

    describe('Azure Regions', () => {
      it('should detect standard Azure regions', () => {
        expect(detectCloudProviderFromRegion('eastus')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('eastus2')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('westus')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('westus2')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('centralus')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('northeurope')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('westeurope')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('japaneast')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('southeastasia')).toBe(CloudProvider.AZURE);
      });

      it('should detect Azure Government regions', () => {
        expect(detectCloudProviderFromRegion('usgovvirginia')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('usgovtexas')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('usgovarizona')).toBe(CloudProvider.AZURE);
      });

      it('should detect Azure China regions', () => {
        expect(detectCloudProviderFromRegion('chinaeast')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('chinanorth')).toBe(CloudProvider.AZURE);
      });
    });

    describe('GCP Regions', () => {
      it('should detect standard GCP regions', () => {
        expect(detectCloudProviderFromRegion('us-central1')).toBe(CloudProvider.GCP);
        expect(detectCloudProviderFromRegion('us-east1')).toBe(CloudProvider.GCP);
        expect(detectCloudProviderFromRegion('us-west1')).toBe(CloudProvider.GCP);
        expect(detectCloudProviderFromRegion('europe-west1')).toBe(CloudProvider.GCP);
        expect(detectCloudProviderFromRegion('europe-west2')).toBe(CloudProvider.GCP);
        expect(detectCloudProviderFromRegion('asia-east1')).toBe(CloudProvider.GCP);
        expect(detectCloudProviderFromRegion('asia-northeast1')).toBe(CloudProvider.GCP);
        expect(detectCloudProviderFromRegion('australia-southeast1')).toBe(CloudProvider.GCP);
      });
    });

    describe('Edge Cases', () => {
      it('should handle confusing or ambiguous regions', () => {
        // This could match both AWS and GCP patterns, but should be identified as GCP
        expect(detectCloudProviderFromRegion('us-east4')).toBe(CloudProvider.GCP);
        
        // This could match both, but should be AWS since it has a hyphen followed by a digit
        expect(detectCloudProviderFromRegion('us-east-2')).toBe(CloudProvider.AWS);
      });

      it('should handle cases with additional qualifiers', () => {
        expect(detectCloudProviderFromRegion('us-east-1-wl1')).toBe(CloudProvider.AWS); // AWS Wavelength Zone
        expect(detectCloudProviderFromRegion('us-east-1-lax-1a')).toBe(CloudProvider.AWS); // AWS Local Zone
      });

      it('should return UNKNOWN for unrecognized regions', () => {
        expect(detectCloudProviderFromRegion('unknown-region')).toBe(CloudProvider.UNKNOWN);
        expect(detectCloudProviderFromRegion('custom-region-name')).toBe(CloudProvider.UNKNOWN);
        expect(detectCloudProviderFromRegion('')).toBe(CloudProvider.UNKNOWN);
      });
    });

    describe('Case Sensitivity', () => {
      it('should be case insensitive', () => {
        expect(detectCloudProviderFromRegion('US-EAST-1')).toBe(CloudProvider.AWS);
        expect(detectCloudProviderFromRegion('EastUS')).toBe(CloudProvider.AZURE);
        expect(detectCloudProviderFromRegion('EUROPE-WEST1')).toBe(CloudProvider.GCP);
      });
    });
  });
}); 
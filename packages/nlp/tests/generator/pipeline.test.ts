/**
 * Tests for the config generation pipeline.
 *
 * @module tests/generator/pipeline
 */

import { generateFromNaturalLanguage } from '../../src/generator/pipeline';
import type { LLMConfig } from '../../src/llm/types';

// Mock the LLM providers
const mockGenerateConfig = jest.fn();

jest.mock('../../src/llm/factory', () => ({
  createProvider: jest.fn().mockImplementation(() => ({
    generateConfig: mockGenerateConfig,
    getName: () => 'anthropic',
    isAvailable: async () => true,
  })),
}));

describe('Config Generation Pipeline', () => {
  const llmConfig: LLMConfig = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    apiKey: 'test-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFromNaturalLanguage', () => {
    it('generates valid config from clear input', async () => {
      const validConfig = {
        baseCidr: '10.0.0.0/8',
        accounts: [
          {
            name: 'production',
            clouds: {
              aws: { regions: ['us-east-1', 'us-west-2'] },
            },
          },
        ],
        subnetTypes: { public: 26, private: 24 },
      };

      mockGenerateConfig.mockResolvedValueOnce({
        config: validConfig,
        tokensUsed: 150,
      });

      const result = await generateFromNaturalLanguage(
        'I need subnets for a production account in AWS us-east-1 and us-west-2',
        llmConfig
      );

      expect(result.success).toBe(true);
      expect(result.config).toEqual(validConfig);
      expect(result.allocations).toBeDefined();
      expect(result.allocations?.length).toBeGreaterThan(0);
    });

    it('validates generated config with Zod schema', async () => {
      // Invalid config - missing required fields
      const invalidConfig = {
        baseCidr: '10.0.0.0/8',
        // missing accounts and subnetTypes
      };

      mockGenerateConfig.mockResolvedValueOnce({
        config: invalidConfig,
        tokensUsed: 100,
      });

      const result = await generateFromNaturalLanguage('Create some subnets', llmConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('detects CIDR overlaps in generated config', async () => {
      // Config with overlapping cloud-level CIDRs
      const overlappingConfig = {
        baseCidr: '10.0.0.0/8',
        accounts: [
          {
            name: 'account1',
            clouds: {
              aws: { baseCidr: '10.0.0.0/16', regions: ['us-east-1'] },
            },
          },
          {
            name: 'account2',
            clouds: {
              azure: { baseCidr: '10.0.0.0/16', regions: ['eastus'] }, // Same CIDR - overlap!
            },
          },
        ],
        subnetTypes: { public: 24 },
      };

      mockGenerateConfig.mockResolvedValueOnce({
        config: overlappingConfig,
        tokensUsed: 200,
      });

      const result = await generateFromNaturalLanguage(
        'Create overlapping accounts',
        llmConfig
      );

      // Note: Overlap detection happens during allocation validation
      // The allocator produces the allocations, then we check for overlaps
      // With same baseCidr, allocations will start from same prefix
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('produces non-overlapping allocations', async () => {
      const validConfig = {
        baseCidr: '10.0.0.0/8',
        accounts: [
          {
            name: 'prod',
            clouds: { aws: { regions: ['us-east-1'] } },
          },
        ],
        subnetTypes: { public: 26, private: 24 },
      };

      mockGenerateConfig.mockResolvedValueOnce({
        config: validConfig,
        tokensUsed: 150,
      });

      const result = await generateFromNaturalLanguage('Create prod subnets', llmConfig);

      expect(result.success).toBe(true);
      expect(result.allocations).toBeDefined();

      // Verify no overlapping allocations
      const cidrs = (result.allocations ?? []).map((a) => a.subnetCidr);
      const uniqueCidrs = new Set(cidrs);
      expect(uniqueCidrs.size).toBe(cidrs.length);
    });

    it('returns structured errors for invalid LLM output', async () => {
      mockGenerateConfig.mockResolvedValueOnce({
        config: null,
        reasoning: 'I need more information about your requirements.',
        tokensUsed: 50,
      });

      const result = await generateFromNaturalLanguage('Create subnets', llmConfig);

      expect(result.success).toBe(false);
      expect(result.needsClarification).toBe(true);
      expect(result.clarificationMessage).toBe(
        'I need more information about your requirements.'
      );
    });

    it('handles LLM timeout gracefully', async () => {
      mockGenerateConfig.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await generateFromNaturalLanguage('Create subnets', llmConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('timeout');
    });

    it('handles LLM API errors gracefully', async () => {
      mockGenerateConfig.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const result = await generateFromNaturalLanguage('Create subnets', llmConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('rate limit');
    });

    it('includes token usage in result', async () => {
      const validConfig = {
        baseCidr: '10.0.0.0/8',
        accounts: [
          { name: 'test', clouds: { aws: { regions: ['us-east-1'] } } },
        ],
        subnetTypes: { public: 24 },
      };

      mockGenerateConfig.mockResolvedValueOnce({
        config: validConfig,
        tokensUsed: 250,
      });

      const result = await generateFromNaturalLanguage('Create test subnets', llmConfig);

      expect(result.tokensUsed).toBe(250);
    });

    it('supports multi-cloud configurations', async () => {
      const multiCloudConfig = {
        baseCidr: '10.0.0.0/8',
        accounts: [
          {
            name: 'multi-cloud',
            clouds: {
              aws: { regions: ['us-east-1'] },
              azure: { regions: ['eastus'] },
              gcp: { regions: ['us-central1'] },
            },
          },
        ],
        subnetTypes: { public: 26, private: 24 },
      };

      mockGenerateConfig.mockResolvedValueOnce({
        config: multiCloudConfig,
        tokensUsed: 300,
      });

      const result = await generateFromNaturalLanguage(
        'Create subnets for AWS, Azure, and GCP',
        llmConfig
      );

      expect(result.success).toBe(true);
      expect(result.allocations).toBeDefined();

      // Should have allocations for all three providers
      const providers = new Set((result.allocations ?? []).map((a) => a.cloudProvider));
      expect(providers.has('aws')).toBe(true);
      expect(providers.has('azure')).toBe(true);
      expect(providers.has('gcp')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles single account, single region', async () => {
      const minimalConfig = {
        baseCidr: '192.168.0.0/16',
        accounts: [
          { name: 'minimal', clouds: { aws: { regions: ['us-east-1'] } } },
        ],
        subnetTypes: { default: 24 },
      };

      mockGenerateConfig.mockResolvedValueOnce({
        config: minimalConfig,
        tokensUsed: 100,
      });

      const result = await generateFromNaturalLanguage('Minimal setup', llmConfig);

      expect(result.success).toBe(true);
      expect(result.allocations?.length).toBeGreaterThan(0);
    });

    it('handles many accounts and regions', async () => {
      const largeConfig = {
        baseCidr: '10.0.0.0/8',
        accounts: Array.from({ length: 10 }, (_, i) => ({
          name: `account-${i + 1}`,
          clouds: {
            aws: { regions: ['us-east-1', 'us-west-2', 'eu-west-1'] },
          },
        })),
        subnetTypes: { public: 26, private: 24, database: 27 },
      };

      mockGenerateConfig.mockResolvedValueOnce({
        config: largeConfig,
        tokensUsed: 500,
      });

      const result = await generateFromNaturalLanguage('Large enterprise setup', llmConfig);

      expect(result.success).toBe(true);
      expect(result.allocations?.length).toBeGreaterThan(100);
    });
  });
});


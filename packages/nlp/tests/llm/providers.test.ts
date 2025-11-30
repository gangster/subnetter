/**
 * Tests for LLM provider implementations.
 *
 * @module tests/llm/providers
 */

import type { LLMConfig } from '../../src/llm/types';

// Create mock functions
const mockAnthropicCreate = jest.fn();
const mockOpenAICreate = jest.fn();

// Mock the external SDKs before importing providers
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockAnthropicCreate,
    },
  })),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  })),
}));

// Mock fetch for Ollama
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocks are set up
import { AnthropicProvider } from '../../src/llm/anthropic';
import { OpenAIProvider } from '../../src/llm/openai';
import { OllamaProvider } from '../../src/llm/ollama';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    const config: LLMConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: 'test-key',
    };
    provider = new AnthropicProvider(config);
  });

  describe('getName', () => {
    it('returns "anthropic"', () => {
      expect(provider.getName()).toBe('anthropic');
    });
  });

  describe('generateConfig', () => {
    it('formats tool_use request correctly', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            name: 'generate_config',
            input: {
              baseCidr: '10.0.0.0/8',
              accounts: [{ name: 'prod', clouds: { aws: { regions: ['us-east-1'] } } }],
              subnetTypes: { public: 26, private: 24 },
            },
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const schema = { type: 'object', properties: {} };
      const response = await provider.generateConfig('Create subnets', schema);

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: 'generate_config',
            }),
          ]),
        })
      );

      expect(response.config).toEqual({
        baseCidr: '10.0.0.0/8',
        accounts: [{ name: 'prod', clouds: { aws: { regions: ['us-east-1'] } } }],
        subnetTypes: { public: 26, private: 24 },
      });
    });

    it('parses tool response into config object', async () => {
      const expectedConfig = {
        baseCidr: '10.0.0.0/8',
        accounts: [{ name: 'test', clouds: { aws: { regions: ['us-west-2'] } } }],
        subnetTypes: { public: 24 },
      };

      mockAnthropicCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            name: 'generate_config',
            input: expectedConfig,
          },
        ],
        usage: { input_tokens: 50, output_tokens: 100 },
      });

      const response = await provider.generateConfig('test', {});

      expect(response.config).toEqual(expectedConfig);
      expect(response.tokensUsed).toBe(150);
    });

    it('handles API errors gracefully', async () => {
      mockAnthropicCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await expect(provider.generateConfig('test', {})).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('handles response without tool_use', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'I cannot generate that configuration.',
          },
        ],
        usage: { input_tokens: 50, output_tokens: 20 },
      });

      const response = await provider.generateConfig('test', {});

      expect(response.config).toBeNull();
      expect(response.reasoning).toBe('I cannot generate that configuration.');
    });
  });

  describe('isAvailable', () => {
    it('returns true when API key is configured', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });
  });
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    const config: LLMConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    };
    provider = new OpenAIProvider(config);
  });

  describe('getName', () => {
    it('returns "openai"', () => {
      expect(provider.getName()).toBe('openai');
    });
  });

  describe('generateConfig', () => {
    it('formats function_call request correctly', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  type: 'function',
                  function: {
                    name: 'generate_config',
                    arguments: JSON.stringify({
                      baseCidr: '10.0.0.0/8',
                      accounts: [{ name: 'prod', clouds: { aws: { regions: ['us-east-1'] } } }],
                      subnetTypes: { public: 26 },
                    }),
                  },
                },
              ],
            },
          },
        ],
        usage: { total_tokens: 200 },
      });

      const schema = { type: 'object', properties: {} };
      await provider.generateConfig('Create subnets', schema);

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          tools: expect.arrayContaining([
            expect.objectContaining({
              type: 'function',
              function: expect.objectContaining({
                name: 'generate_config',
              }),
            }),
          ]),
        })
      );
    });

    it('parses function response into config object', async () => {
      const expectedConfig = {
        baseCidr: '172.16.0.0/12',
        accounts: [{ name: 'staging', clouds: { azure: { regions: ['eastus'] } } }],
        subnetTypes: { private: 24 },
      };

      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  type: 'function',
                  function: {
                    name: 'generate_config',
                    arguments: JSON.stringify(expectedConfig),
                  },
                },
              ],
            },
          },
        ],
        usage: { total_tokens: 150 },
      });

      const response = await provider.generateConfig('test', {});

      expect(response.config).toEqual(expectedConfig);
      expect(response.tokensUsed).toBe(150);
    });

    it('handles API errors gracefully', async () => {
      mockOpenAICreate.mockRejectedValueOnce(new Error('Invalid API key'));

      await expect(provider.generateConfig('test', {})).rejects.toThrow('Invalid API key');
    });

    it('handles response without function call', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'I need more information.',
            },
          },
        ],
        usage: { total_tokens: 50 },
      });

      const response = await provider.generateConfig('test', {});

      expect(response.config).toBeNull();
      expect(response.reasoning).toBe('I need more information.');
    });
  });
});

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    const config: LLMConfig = {
      provider: 'ollama',
      model: 'llama3.1',
      baseUrl: 'http://localhost:11434',
    };
    provider = new OllamaProvider(config);
  });

  describe('getName', () => {
    it('returns "ollama"', () => {
      expect(provider.getName()).toBe('ollama');
    });
  });

  describe('generateConfig', () => {
    it('sends request to Ollama API', async () => {
      const expectedConfig = {
        baseCidr: '10.0.0.0/8',
        accounts: [{ name: 'local', clouds: { aws: { regions: ['us-east-1'] } } }],
        subnetTypes: { public: 24 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: {
              content: JSON.stringify(expectedConfig),
            },
          }),
      });

      const response = await provider.generateConfig('test', {});

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.config).toEqual(expectedConfig);
    });

    it('handles connection errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(provider.generateConfig('test', {})).rejects.toThrow('Connection refused');
    });

    it('handles non-JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: {
              content: 'This is not JSON',
            },
          }),
      });

      const response = await provider.generateConfig('test', {});

      expect(response.config).toBeNull();
      expect(response.reasoning).toBe('This is not JSON');
    });
  });

  describe('isAvailable', () => {
    it('returns true when Ollama is running', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '0.1.0' }),
      });

      const available = await provider.isAvailable();

      expect(available).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/version');
    });

    it('returns false when Ollama is not running', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });
  });
});

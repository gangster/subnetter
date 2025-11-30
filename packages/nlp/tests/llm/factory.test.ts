/**
 * Tests for the LLM provider factory.
 *
 * @module tests/llm/factory
 */

import { createProvider, getDefaultModel } from '../../src/llm/factory';
import type { LLMConfig, ProviderType } from '../../src/llm/types';

describe('LLM Provider Factory', () => {
  describe('createProvider', () => {
    it('creates an Anthropic provider when provider is "anthropic"', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key',
      };

      const provider = createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.getName()).toBe('anthropic');
    });

    it('creates an OpenAI provider when provider is "openai"', () => {
      const config: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      };

      const provider = createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.getName()).toBe('openai');
    });

    it('creates an Ollama provider when provider is "ollama"', () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'llama3.1',
        baseUrl: 'http://localhost:11434',
      };

      const provider = createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.getName()).toBe('ollama');
    });

    it('throws an error for unknown provider type', () => {
      const config = {
        provider: 'unknown' as ProviderType,
        model: 'test',
      };

      expect(() => createProvider(config)).toThrow('Unknown provider: unknown');
    });

    it('uses ANTHROPIC_API_KEY env var when apiKey not provided', () => {
      const originalEnv = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'env-key';

      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
      };

      const provider = createProvider(config);
      expect(provider).toBeDefined();

      process.env.ANTHROPIC_API_KEY = originalEnv;
    });

    it('uses OPENAI_API_KEY env var when apiKey not provided', () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'env-key';

      const config: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4o',
      };

      const provider = createProvider(config);
      expect(provider).toBeDefined();

      process.env.OPENAI_API_KEY = originalEnv;
    });

    it('uses default Ollama URL when baseUrl not provided', () => {
      const config: LLMConfig = {
        provider: 'ollama',
        model: 'llama3.1',
      };

      const provider = createProvider(config);
      expect(provider).toBeDefined();
    });
  });

  describe('getDefaultModel', () => {
    it('returns claude-sonnet-4-20250514 for anthropic', () => {
      expect(getDefaultModel('anthropic')).toBe('claude-sonnet-4-20250514');
    });

    it('returns gpt-4o for openai', () => {
      expect(getDefaultModel('openai')).toBe('gpt-4o');
    });

    it('returns llama3.1 for ollama', () => {
      expect(getDefaultModel('ollama')).toBe('llama3.1');
    });
  });
});


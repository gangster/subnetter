/**
 * @module llm/factory
 * @description Factory for creating LLM provider instances.
 *
 * This module provides a factory function to create the appropriate LLM provider
 * based on configuration, handling API keys and default settings.
 *
 * @example
 * ```typescript
 * import { createProvider } from '@subnetter/nlp';
 *
 * const provider = createProvider({
 *   provider: 'anthropic',
 *   model: 'claude-sonnet-4-20250514',
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 * });
 *
 * const response = await provider.generateConfig('Create subnets...', schema);
 * ```
 *
 * @packageDocumentation
 */

import type { LLMConfig, LLMProvider, ProviderType } from './types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { OllamaProvider } from './ollama';

/**
 * Default models for each provider.
 */
const DEFAULT_MODELS: Record<ProviderType, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  ollama: 'llama3.1',
};

/**
 * Default Ollama base URL.
 */
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/**
 * Gets the default model for a given provider.
 *
 * @param provider - The provider type
 * @returns The default model name for that provider
 */
export function getDefaultModel(provider: ProviderType): string {
  return DEFAULT_MODELS[provider];
}

/**
 * Creates an LLM provider instance based on configuration.
 *
 * @param config - Configuration specifying the provider and settings
 * @returns An LLM provider instance ready to use
 * @throws Error if the provider type is unknown
 *
 * @remarks
 * API keys are resolved in the following order:
 * 1. Explicit `apiKey` in config
 * 2. Environment variable (ANTHROPIC_API_KEY, OPENAI_API_KEY)
 * 3. None (throws for providers requiring a key)
 *
 * @example
 * ```typescript
 * // Using explicit API key
 * const provider = createProvider({
 *   provider: 'anthropic',
 *   model: 'claude-sonnet-4-20250514',
 *   apiKey: 'sk-ant-...',
 * });
 *
 * // Using environment variable
 * const provider = createProvider({
 *   provider: 'openai',
 *   model: 'gpt-4o',
 *   // Uses OPENAI_API_KEY from environment
 * });
 *
 * // Local Ollama (no key needed)
 * const provider = createProvider({
 *   provider: 'ollama',
 *   model: 'llama3.1',
 * });
 * ```
 */
export function createProvider(config: LLMConfig): LLMProvider {
  const resolvedConfig = resolveConfig(config);

  switch (resolvedConfig.provider) {
    case 'anthropic':
      return new AnthropicProvider(resolvedConfig);
    case 'openai':
      return new OpenAIProvider(resolvedConfig);
    case 'ollama':
      return new OllamaProvider(resolvedConfig);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Resolves configuration with defaults and environment variables.
 *
 * @param config - User-provided configuration
 * @returns Fully resolved configuration
 */
function resolveConfig(config: LLMConfig): LLMConfig {
  const resolved: LLMConfig = {
    ...config,
    model: config.model || DEFAULT_MODELS[config.provider],
    temperature: config.temperature ?? 0.1,
    maxTokens: config.maxTokens ?? 4096,
  };

  // Resolve API keys from environment
  if (!resolved.apiKey) {
    switch (config.provider) {
      case 'anthropic':
        resolved.apiKey = process.env.ANTHROPIC_API_KEY;
        break;
      case 'openai':
        resolved.apiKey = process.env.OPENAI_API_KEY;
        break;
      case 'ollama':
        // Ollama doesn't need an API key
        break;
    }
  }

  // Resolve Ollama base URL
  if (config.provider === 'ollama' && !resolved.baseUrl) {
    resolved.baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL;
  }

  return resolved;
}


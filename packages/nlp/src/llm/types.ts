/**
 * @module llm/types
 * @description Type definitions for LLM provider abstraction.
 *
 * This module defines the interfaces and types used across all LLM providers,
 * enabling a consistent API regardless of the underlying model.
 *
 * @packageDocumentation
 */

/**
 * Supported LLM provider types.
 */
export type ProviderType = 'anthropic' | 'openai' | 'ollama';

/**
 * Configuration for connecting to an LLM provider.
 *
 * @example
 * ```typescript
 * // Anthropic configuration
 * const anthropicConfig: LLMConfig = {
 *   provider: 'anthropic',
 *   model: 'claude-sonnet-4-20250514',
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 * };
 *
 * // OpenAI configuration
 * const openaiConfig: LLMConfig = {
 *   provider: 'openai',
 *   model: 'gpt-4o',
 *   apiKey: process.env.OPENAI_API_KEY,
 * };
 *
 * // Ollama (local) configuration
 * const ollamaConfig: LLMConfig = {
 *   provider: 'ollama',
 *   model: 'llama3.1',
 *   baseUrl: 'http://localhost:11434',
 * };
 * ```
 */
export interface LLMConfig {
  /** The LLM provider to use */
  provider: ProviderType;

  /** Model name/identifier */
  model: string;

  /** API key for authentication (not needed for Ollama) */
  apiKey?: string;

  /** Base URL for API requests (required for Ollama, optional for others) */
  baseUrl?: string;

  /** Temperature for response randomness (0-1, lower = more deterministic) */
  temperature?: number;

  /** Maximum tokens in the response */
  maxTokens?: number;
}

/**
 * Response from an LLM provider after config generation.
 *
 * @example
 * ```typescript
 * const response: LLMResponse = {
 *   config: {
 *     baseCidr: '10.0.0.0/8',
 *     accounts: [{ name: 'prod', clouds: { aws: { regions: ['us-east-1'] } } }],
 *     subnetTypes: { public: 26, private: 24 },
 *   },
 *   reasoning: 'Created a simple AWS setup with public and private subnets',
 *   tokensUsed: 150,
 * };
 * ```
 */
export interface LLMResponse {
  /** The generated configuration object (needs validation) */
  config: unknown;

  /** Optional explanation from the LLM about its choices */
  reasoning?: string;

  /** Number of tokens used in the request/response */
  tokensUsed?: number;

  /** The raw response from the provider (for debugging) */
  rawResponse?: unknown;
}

/**
 * Error response from an LLM provider.
 */
export interface LLMError {
  /** Error type/code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Whether the request can be retried */
  retryable: boolean;

  /** Suggested wait time before retry (in ms) */
  retryAfter?: number;
}

/**
 * Interface that all LLM providers must implement.
 *
 * @remarks
 * This abstraction allows the NLP pipeline to work with any supported
 * LLM provider through a consistent interface.
 *
 * @example
 * ```typescript
 * class AnthropicProvider implements LLMProvider {
 *   async generateConfig(prompt: string, schema: object): Promise<LLMResponse> {
 *     // Implementation using Anthropic SDK
 *   }
 *
 *   async extractPartialConfig(prompt: string): Promise<LLMResponse> {
 *     // Implementation for partial extraction
 *   }
 * }
 * ```
 */
export interface LLMProvider {
  /**
   * Generate a complete configuration from a natural language prompt.
   *
   * @param prompt - The user's natural language requirements
   * @param schema - JSON Schema describing the expected output format
   * @returns A promise resolving to the LLM response with generated config
   * @throws {LLMError} If the API call fails
   */
  generateConfig(prompt: string, schema: object): Promise<LLMResponse>;

  /**
   * Extract partial configuration from a response to a clarification question.
   *
   * @param prompt - The user's response to a clarification question
   * @param context - Previous conversation context
   * @returns A promise resolving to partial config data
   */
  extractPartialConfig?(
    prompt: string,
    context?: ConversationContext
  ): Promise<LLMResponse>;

  /**
   * Check if the provider is available and configured correctly.
   *
   * @returns True if the provider is ready to use
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the name of this provider.
   */
  getName(): ProviderType;
}

/**
 * Context from previous conversation turns.
 */
export interface ConversationContext {
  /** Previous messages in the conversation */
  messages: ConversationMessage[];

  /** Partially built configuration */
  partialConfig?: unknown;

  /** Fields that still need values */
  missingFields?: string[];
}

/**
 * A single message in the conversation history.
 */
export interface ConversationMessage {
  /** Who sent this message */
  role: 'user' | 'assistant' | 'system';

  /** Message content */
  content: string;

  /** Timestamp */
  timestamp?: Date;
}


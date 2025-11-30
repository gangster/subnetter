/**
 * @module @subnetter/nlp
 * @description Natural language interface for Subnetter CIDR allocation.
 *
 * This package provides tools to convert natural language requirements
 * into valid Subnetter configurations and generate CIDR allocations.
 *
 * @example
 * ```typescript
 * import { generateFromNaturalLanguage } from '@subnetter/nlp';
 *
 * const result = await generateFromNaturalLanguage(
 *   'I need subnets for 2 AWS accounts in us-east-1 with public and private subnets',
 *   {
 *     provider: 'anthropic',
 *     model: 'claude-sonnet-4-20250514',
 *     apiKey: process.env.ANTHROPIC_API_KEY,
 *   }
 * );
 *
 * if (result.success) {
 *   console.log(`Generated ${result.allocations.length} allocations`);
 * }
 * ```
 *
 * @packageDocumentation
 */

// Main generation pipeline
export { generateFromNaturalLanguage } from './generator';
export type {
  GenerationResult,
  GenerationOptions,
  ValidationError,
} from './generator';

// Schema utilities
export { getConfigJsonSchema, type JsonSchema } from './schema/converter';

// LLM providers and types
export {
  createProvider,
  getDefaultModel,
  AnthropicProvider,
  OpenAIProvider,
  OllamaProvider,
} from './llm';

export type {
  LLMProvider,
  LLMConfig,
  LLMResponse,
  LLMError,
  ProviderType,
  ConversationContext,
  ConversationMessage,
} from './llm';


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
 *   'I need subnets for 2 AWS accounts in us-east-1',
 *   { provider: 'anthropic', model: 'claude-sonnet-4-20250514' }
 * );
 * ```
 *
 * @packageDocumentation
 */

// Schema utilities
export { getConfigJsonSchema, type JsonSchema } from './schema/converter';

// LLM types and providers (Phase 1)
export type {
  LLMProvider,
  LLMConfig,
  LLMResponse,
  ProviderType,
} from './llm/types';


/**
 * @module generator/types
 * @description Type definitions for the config generation pipeline.
 *
 * @packageDocumentation
 */

import type { Config, Allocation } from '@subnetter/core';

/**
 * Result of a natural language config generation attempt.
 *
 * @example
 * ```typescript
 * const result = await generateFromNaturalLanguage(input, llmConfig);
 *
 * if (result.success) {
 *   console.log(`Generated ${result.allocations.length} allocations`);
 * } else if (result.needsClarification) {
 *   console.log(`Please clarify: ${result.clarificationMessage}`);
 * } else {
 *   console.error('Errors:', result.errors);
 * }
 * ```
 */
export interface GenerationResult {
  /** Whether config generation and allocation succeeded */
  success: boolean;

  /** The validated configuration (if successful) */
  config?: Config;

  /** Generated CIDR allocations (if successful) */
  allocations?: Allocation[];

  /** Error messages if generation failed */
  errors?: string[];

  /** Whether the LLM needs more information */
  needsClarification?: boolean;

  /** Message from the LLM requesting clarification */
  clarificationMessage?: string;

  /** Number of tokens used in the LLM request */
  tokensUsed?: number;

  /** Raw LLM response for debugging */
  rawResponse?: unknown;
}

/**
 * Options for the generation pipeline.
 */
export interface GenerationOptions {
  /** Whether to validate the generated config */
  validate?: boolean;

  /** Whether to generate allocations after validation */
  generateAllocations?: boolean;

  /** Whether to check for CIDR overlaps */
  checkOverlaps?: boolean;

  /** Custom system prompt for the LLM */
  systemPrompt?: string;
}

/**
 * Validation error from config generation.
 */
export interface ValidationError {
  /** The field that failed validation */
  field: string;

  /** Error message */
  message: string;

  /** Error code if available */
  code?: string;
}


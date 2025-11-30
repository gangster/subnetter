/**
 * @module generator/pipeline
 * @description Main config generation pipeline for natural language input.
 *
 * This module orchestrates the full flow from natural language to allocations:
 * 1. Send prompt to LLM with schema
 * 2. Validate response with Zod
 * 3. Check for CIDR overlaps
 * 4. Generate allocations
 * 5. Validate output
 *
 * @example
 * ```typescript
 * import { generateFromNaturalLanguage } from '@subnetter/nlp';
 *
 * const result = await generateFromNaturalLanguage(
 *   'I need subnets for 2 AWS accounts in us-east-1',
 *   { provider: 'anthropic', model: 'claude-sonnet-4-20250514', apiKey: '...' }
 * );
 *
 * if (result.success) {
 *   console.log(`Generated ${result.allocations.length} subnets`);
 * }
 * ```
 *
 * @packageDocumentation
 */

import {
  configSchema,
  CidrAllocator,
  validateNoOverlappingCidrs,
  type Config,
} from '@subnetter/core';
import { createProvider } from '../llm/factory';
import { getConfigJsonSchema } from '../schema/converter';
import type { LLMConfig } from '../llm/types';
import type { GenerationResult, GenerationOptions } from './types';

/**
 * Default generation options.
 */
const DEFAULT_OPTIONS: GenerationOptions = {
  validate: true,
  generateAllocations: true,
  checkOverlaps: true,
};

/**
 * Generates CIDR allocations from natural language input.
 *
 * @param input - Natural language description of network requirements
 * @param llmConfig - Configuration for the LLM provider
 * @param options - Optional generation settings
 * @returns Result containing config, allocations, or errors
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await generateFromNaturalLanguage(
 *   'Create subnets for production AWS account in us-east-1 and us-west-2',
 *   { provider: 'anthropic', model: 'claude-sonnet-4-20250514', apiKey: '...' }
 * );
 *
 * // With options
 * const result = await generateFromNaturalLanguage(
 *   'Create subnets...',
 *   llmConfig,
 *   { validate: true, checkOverlaps: true }
 * );
 * ```
 */
export async function generateFromNaturalLanguage(
  input: string,
  llmConfig: LLMConfig,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Step 1: Create LLM provider and generate config
    const provider = createProvider(llmConfig);
    const schema = getConfigJsonSchema();

    const llmResponse = await provider.generateConfig(input, schema);

    // Handle case where LLM didn't produce a config
    if (!llmResponse.config) {
      return {
        success: false,
        needsClarification: true,
        clarificationMessage:
          llmResponse.reasoning || 'Unable to generate configuration from input.',
        tokensUsed: llmResponse.tokensUsed,
        rawResponse: llmResponse.rawResponse,
      };
    }

    // Step 2: Validate config with Zod schema
    if (opts.validate) {
      const validationResult = configSchema.safeParse(llmResponse.config);

      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`
        );
        return {
          success: false,
          errors,
          tokensUsed: llmResponse.tokensUsed,
          rawResponse: llmResponse.rawResponse,
        };
      }
    }

    // At this point, config is valid
    const config = llmResponse.config as Config;

    // Step 3: Generate allocations
    if (!opts.generateAllocations) {
      return {
        success: true,
        config,
        tokensUsed: llmResponse.tokensUsed,
        rawResponse: llmResponse.rawResponse,
      };
    }

    const allocator = new CidrAllocator(config);
    const allocations = allocator.generateAllocations();

    // Step 4: Validate no overlapping CIDRs in output
    if (opts.checkOverlaps) {
      const overlapCheck = validateNoOverlappingCidrs(allocations);

      if (!overlapCheck.valid) {
        const overlapErrors = overlapCheck.overlaps.map(
          (o) => `CIDR overlap: ${o.cidr1} overlaps with ${o.cidr2}`
        );
        return {
          success: false,
          config,
          errors: overlapErrors,
          tokensUsed: llmResponse.tokensUsed,
          rawResponse: llmResponse.rawResponse,
        };
      }
    }

    // Success!
    return {
      success: true,
      config,
      allocations,
      tokensUsed: llmResponse.tokensUsed,
      rawResponse: llmResponse.rawResponse,
    };
  } catch (error) {
    // Handle errors from LLM or allocation
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      success: false,
      errors: [errorMessage],
    };
  }
}


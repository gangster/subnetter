/**
 * @module schema/converter
 * @description Converts Zod schemas to JSON Schema for LLM function calling.
 *
 * This module provides utilities to transform the Subnetter configuration
 * schema from Zod format to JSON Schema, which is required by LLM providers
 * for structured output and function/tool calling.
 *
 * @example
 * ```typescript
 * import { getConfigJsonSchema } from '@subnetter/nlp';
 *
 * const jsonSchema = getConfigJsonSchema();
 * // Use with OpenAI function calling or Anthropic tool use
 * ```
 *
 * @packageDocumentation
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { configSchema } from '@subnetter/core';

/**
 * JSON Schema type definition.
 *
 * @remarks
 * A subset of the JSON Schema specification relevant for LLM tool use.
 * This type is intentionally simplified to cover common use cases.
 */
export interface JsonSchema {
  /** JSON Schema draft version */
  $schema?: string;
  /** Schema identifier */
  $id?: string;
  /** Reference to another schema */
  $ref?: string;
  /** Schema title for identification */
  title?: string;
  /** Human-readable description */
  description?: string;
  /** JSON type (object, array, string, number, boolean, null) */
  type?: string;
  /** Object properties */
  properties?: Record<string, JsonSchema>;
  /** Required property names */
  required?: string[];
  /** Array item schema */
  items?: JsonSchema;
  /** Additional properties schema for records */
  additionalProperties?: JsonSchema | boolean;
  /** String pattern (regex) */
  pattern?: string;
  /** Minimum value for numbers */
  minimum?: number;
  /** Maximum value for numbers */
  maximum?: number;
  /** Minimum string length */
  minLength?: number;
  /** Maximum string length */
  maxLength?: number;
  /** Enum values */
  enum?: unknown[];
  /** Default value */
  default?: unknown;
  /** Const value */
  const?: unknown;
  /** OneOf schemas */
  oneOf?: JsonSchema[];
  /** AnyOf schemas */
  anyOf?: JsonSchema[];
  /** AllOf schemas */
  allOf?: JsonSchema[];
}

/**
 * Converts the Subnetter configuration schema to JSON Schema format.
 *
 * @remarks
 * The conversion uses the following options for LLM compatibility:
 * - `$refStrategy: 'none'` - Inlines all references instead of using $ref
 * - Includes descriptions from Zod schema for LLM understanding
 * - Produces a self-contained schema that can be sent in a single API call
 *
 * @returns A JSON Schema object representing the Subnetter configuration
 *
 * @example
 * ```typescript
 * import { getConfigJsonSchema } from '@subnetter/nlp';
 *
 * const schema = getConfigJsonSchema();
 *
 * // Use with Anthropic Claude
 * const response = await anthropic.messages.create({
 *   tools: [{
 *     name: 'generate_config',
 *     description: 'Generate Subnetter configuration',
 *     input_schema: schema,
 *   }],
 *   // ...
 * });
 *
 * // Use with OpenAI
 * const response = await openai.chat.completions.create({
 *   tools: [{
 *     type: 'function',
 *     function: {
 *       name: 'generate_config',
 *       description: 'Generate Subnetter configuration',
 *       parameters: schema,
 *     },
 *   }],
 *   // ...
 * });
 * ```
 */
export function getConfigJsonSchema(): JsonSchema {
  // Use type assertion to handle complex Zod schema types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSchema = zodToJsonSchema(configSchema as any, {
    name: 'SubnetterConfig',
    $refStrategy: 'none', // Inline all refs for LLM compatibility
    errorMessages: true,
  }) as JsonSchema & { definitions?: Record<string, JsonSchema> };

  // zod-to-json-schema may return a schema with $ref and definitions
  // We need to extract the actual schema from definitions for LLM compatibility
  let result: JsonSchema;

  if (rawSchema.$ref && rawSchema.definitions) {
    // Extract the main schema from definitions
    const refName = rawSchema.$ref.replace('#/definitions/', '');
    const mainSchema = rawSchema.definitions[refName];

    if (mainSchema) {
      result = {
        $schema: rawSchema.$schema,
        ...mainSchema,
      };
    } else {
      result = rawSchema;
    }
  } else {
    result = rawSchema;
  }

  // Add title if not present
  if (!result.title) {
    result.title = 'SubnetterConfig';
  }

  // Add high-level description for LLM context
  if (!result.description) {
    result.description =
      'Configuration for Subnetter CIDR allocation. Defines base CIDR, accounts, cloud providers, regions, and subnet types.';
  }

  return result;
}


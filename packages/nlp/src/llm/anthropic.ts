/**
 * @module llm/anthropic
 * @description Anthropic Claude LLM provider implementation.
 *
 * This module implements the LLM provider interface for Anthropic's Claude models,
 * using their tool_use feature for structured output.
 *
 * @packageDocumentation
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  LLMConfig,
  LLMResponse,
  ProviderType,
  ConversationContext,
} from './types';

/**
 * LLM provider implementation for Anthropic Claude.
 *
 * @remarks
 * Uses Anthropic's tool_use feature to generate structured configuration.
 * The model is instructed to use the `generate_config` tool to produce output.
 *
 * @example
 * ```typescript
 * const provider = new AnthropicProvider({
 *   provider: 'anthropic',
 *   model: 'claude-sonnet-4-20250514',
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 * });
 *
 * const response = await provider.generateConfig(
 *   'I need subnets for AWS in us-east-1',
 *   configJsonSchema
 * );
 * ```
 */
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private config: LLMConfig;

  /**
   * Creates a new Anthropic provider.
   *
   * @param config - Provider configuration including API key and model
   */
  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Returns the provider type identifier.
   */
  getName(): ProviderType {
    return 'anthropic';
  }

  /**
   * Generates a configuration from natural language input.
   *
   * @param prompt - User's natural language requirements
   * @param schema - JSON Schema for the expected output
   * @returns LLM response with generated config or reasoning
   */
  async generateConfig(prompt: string, schema: object): Promise<LLMResponse> {
    const systemPrompt = `You are a network infrastructure expert helping users plan their cloud network architecture.
When the user describes their requirements, use the generate_config tool to create a valid Subnetter configuration.
Be precise with CIDR blocks and follow cloud provider conventions for regions and availability zones.
If the requirements are unclear, ask clarifying questions instead of guessing.`;

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature ?? 0.1,
      system: systemPrompt,
      tools: [
        {
          name: 'generate_config',
          description:
            'Generate a Subnetter configuration for CIDR allocation based on user requirements',
          input_schema: schema as Anthropic.Tool['input_schema'],
        },
      ],
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return this.parseResponse(response);
  }

  /**
   * Extracts partial configuration from a clarification response.
   *
   * @param prompt - User's response to a clarification question
   * @param context - Previous conversation context
   * @returns LLM response with partial config data
   */
  async extractPartialConfig(
    prompt: string,
    context?: ConversationContext
  ): Promise<LLMResponse> {
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    if (context?.messages) {
      for (const msg of context.messages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature ?? 0.1,
      system: `Extract the network configuration information from the user's response.
Focus on: accounts, regions, cloud providers, subnet types, and CIDR preferences.
Use the generate_config tool to output any configuration you can extract.`,
      tools: [
        {
          name: 'generate_config',
          description: 'Extract configuration from user response',
          input_schema: {
            type: 'object',
            properties: {
              baseCidr: { type: 'string' },
              accounts: { type: 'array' },
              subnetTypes: { type: 'object' },
              cloudProviders: { type: 'array' },
            },
          },
        },
      ],
      messages,
    });

    return this.parseResponse(response);
  }

  /**
   * Checks if the provider is available and configured.
   *
   * @returns True if API key is set and valid
   */
  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  /**
   * Parses the Anthropic API response into our standard format.
   *
   * @param response - Raw Anthropic API response
   * @returns Normalized LLM response
   */
  private parseResponse(response: Anthropic.Message): LLMResponse {
    const tokensUsed =
      (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

    // Look for tool_use content
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (toolUse) {
      return {
        config: toolUse.input,
        tokensUsed,
        rawResponse: response,
      };
    }

    // If no tool use, return text as reasoning
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    return {
      config: null,
      reasoning: textBlock?.text,
      tokensUsed,
      rawResponse: response,
    };
  }
}


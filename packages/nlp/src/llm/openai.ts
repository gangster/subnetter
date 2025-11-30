/**
 * @module llm/openai
 * @description OpenAI GPT LLM provider implementation.
 *
 * This module implements the LLM provider interface for OpenAI's GPT models,
 * using their function calling feature for structured output.
 *
 * @packageDocumentation
 */

import OpenAI from 'openai';
import type {
  LLMProvider,
  LLMConfig,
  LLMResponse,
  ProviderType,
  ConversationContext,
} from './types';

/**
 * LLM provider implementation for OpenAI GPT.
 *
 * @remarks
 * Uses OpenAI's function calling feature to generate structured configuration.
 * The model is instructed to use the `generate_config` function to produce output.
 *
 * @example
 * ```typescript
 * const provider = new OpenAIProvider({
 *   provider: 'openai',
 *   model: 'gpt-4o',
 *   apiKey: process.env.OPENAI_API_KEY,
 * });
 *
 * const response = await provider.generateConfig(
 *   'I need subnets for Azure in eastus',
 *   configJsonSchema
 * );
 * ```
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private config: LLMConfig;

  /**
   * Creates a new OpenAI provider.
   *
   * @param config - Provider configuration including API key and model
   */
  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  /**
   * Returns the provider type identifier.
   */
  getName(): ProviderType {
    return 'openai';
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
When the user describes their requirements, use the generate_config function to create a valid Subnetter configuration.
Be precise with CIDR blocks and follow cloud provider conventions for regions and availability zones.
If the requirements are unclear, ask clarifying questions instead of guessing.`;

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature ?? 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_config',
            description:
              'Generate a Subnetter configuration for CIDR allocation based on user requirements',
            parameters: schema as OpenAI.FunctionParameters,
          },
        },
      ],
      tool_choice: 'auto',
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
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `Extract the network configuration information from the user's response.
Focus on: accounts, regions, cloud providers, subnet types, and CIDR preferences.
Use the generate_config function to output any configuration you can extract.`,
      },
    ];

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

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature ?? 0.1,
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_config',
            description: 'Extract configuration from user response',
            parameters: {
              type: 'object',
              properties: {
                baseCidr: { type: 'string' },
                accounts: { type: 'array' },
                subnetTypes: { type: 'object' },
                cloudProviders: { type: 'array' },
              },
            } as OpenAI.FunctionParameters,
          },
        },
      ],
    });

    return this.parseResponse(response);
  }

  /**
   * Checks if the provider is available and configured.
   *
   * @returns True if API key is set
   */
  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  /**
   * Parses the OpenAI API response into our standard format.
   *
   * @param response - Raw OpenAI API response
   * @returns Normalized LLM response
   */
  private parseResponse(
    response: OpenAI.ChatCompletion
  ): LLMResponse {
    const tokensUsed = response.usage?.total_tokens ?? 0;
    const choice = response.choices[0];

    if (!choice) {
      return {
        config: null,
        reasoning: 'No response from model',
        tokensUsed,
        rawResponse: response,
      };
    }

    // Check for tool calls
    const toolCall = choice.message.tool_calls?.[0];

    if (toolCall && toolCall.type === 'function') {
      try {
        const config = JSON.parse(toolCall.function.arguments);
        return {
          config,
          tokensUsed,
          rawResponse: response,
        };
      } catch {
        return {
          config: null,
          reasoning: 'Failed to parse function arguments',
          tokensUsed,
          rawResponse: response,
        };
      }
    }

    // Return text content as reasoning
    return {
      config: null,
      reasoning: choice.message.content ?? undefined,
      tokensUsed,
      rawResponse: response,
    };
  }
}


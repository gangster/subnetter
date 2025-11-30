/**
 * @module llm/ollama
 * @description Ollama local LLM provider implementation.
 *
 * This module implements the LLM provider interface for Ollama,
 * enabling local model usage without API keys or costs.
 *
 * @packageDocumentation
 */

import type {
  LLMProvider,
  LLMConfig,
  LLMResponse,
  ProviderType,
  ConversationContext,
} from './types';

/**
 * Default Ollama API endpoint.
 */
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/**
 * LLM provider implementation for Ollama (local models).
 *
 * @remarks
 * Ollama runs locally and doesn't require an API key.
 * This provider uses the chat API with structured prompting
 * to generate JSON output.
 *
 * @example
 * ```typescript
 * const provider = new OllamaProvider({
 *   provider: 'ollama',
 *   model: 'llama3.1',
 *   baseUrl: 'http://localhost:11434', // optional
 * });
 *
 * const response = await provider.generateConfig(
 *   'I need subnets for GCP in us-central1',
 *   configJsonSchema
 * );
 * ```
 */
export class OllamaProvider implements LLMProvider {
  private config: LLMConfig;
  private baseUrl: string;

  /**
   * Creates a new Ollama provider.
   *
   * @param config - Provider configuration including model and base URL
   */
  constructor(config: LLMConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || DEFAULT_OLLAMA_URL;
  }

  /**
   * Returns the provider type identifier.
   */
  getName(): ProviderType {
    return 'ollama';
  }

  /**
   * Generates a configuration from natural language input.
   *
   * @param prompt - User's natural language requirements
   * @param schema - JSON Schema for the expected output (used for prompting)
   * @returns LLM response with generated config or reasoning
   */
  async generateConfig(prompt: string, _schema: object): Promise<LLMResponse> {
    const systemPrompt = `You are a network infrastructure expert helping users plan their cloud network architecture.
Generate a valid Subnetter configuration based on the user's requirements.

IMPORTANT: The configuration structure requires:
- baseCidr: The root CIDR block (e.g., "10.0.0.0/8")
- accounts: Array of account objects, each with:
  - name: Account identifier (e.g., "prod", "staging")
  - clouds: Object mapping cloud providers to their config:
    - aws/azure/gcp: Object with "regions" array (e.g., {"azure": {"regions": ["eastus"]}})
- subnetTypes: Object mapping subnet names to prefix lengths (e.g., {"public": 26, "private": 24})
- prefixLengths (optional): Object with account/region/az prefix sizes
  - Defaults: account=16, region=20, az=24
  - IMPORTANT: If subnet types include /24 or larger, set az to 22 or smaller to fit all subnets

Example with mixed subnet sizes (/26 and /24):
{
  "baseCidr": "10.0.0.0/8",
  "prefixLengths": {"account": 16, "region": 20, "az": 22},
  "accounts": [
    {"name": "prod", "clouds": {"azure": {"regions": ["eastus"]}}},
    {"name": "staging", "clouds": {"azure": {"regions": ["eastus"]}}}
  ],
  "subnetTypes": {"public": 26, "private": 24}
}

Your response must be ONLY valid JSON. Do not include any explanation or markdown.
Be precise with CIDR blocks and follow cloud provider conventions for regions.`;

    const response = await this.chat(systemPrompt, prompt);
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
    let fullPrompt = '';

    // Include conversation history
    if (context?.messages) {
      for (const msg of context.messages) {
        fullPrompt += `${msg.role}: ${msg.content}\n`;
      }
    }

    fullPrompt += `user: ${prompt}`;

    const systemPrompt = `Extract network configuration information from the conversation.
Focus on: accounts, regions, cloud providers, subnet types, and CIDR preferences.

Return ONLY a JSON object with any configuration you can extract:
{
  "baseCidr": "string or null",
  "accounts": "array or null",
  "subnetTypes": "object or null",
  "cloudProviders": "array or null"
}

Do not include null fields. Return only the JSON object.`;

    const response = await this.chat(systemPrompt, fullPrompt);
    return this.parseResponse(response);
  }

  /**
   * Checks if Ollama is available and running.
   *
   * @returns True if Ollama is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Sends a chat request to the Ollama API.
   *
   * @param systemPrompt - System instructions
   * @param userPrompt - User message
   * @returns Raw API response
   */
  private async chat(
    systemPrompt: string,
    userPrompt: string
  ): Promise<OllamaResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: {
          temperature: this.config.temperature ?? 0.1,
          num_predict: this.config.maxTokens ?? 4096,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    return response.json() as Promise<OllamaResponse>;
  }

  /**
   * Parses the Ollama API response into our standard format.
   *
   * @param response - Raw Ollama API response
   * @returns Normalized LLM response
   */
  private parseResponse(response: OllamaResponse): LLMResponse {
    const content = response.message?.content || '';

    // Try to parse as JSON
    try {
      // Handle potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

      const config = JSON.parse(jsonStr);
      return {
        config,
        rawResponse: response,
      };
    } catch {
      // Not valid JSON, return as reasoning
      return {
        config: null,
        reasoning: content,
        rawResponse: response,
      };
    }
  }
}

/**
 * Ollama API response type.
 */
interface OllamaResponse {
  message?: {
    role: string;
    content: string;
  };
  done?: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}


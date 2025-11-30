# @subnetter/nlp

Natural language interface for Subnetter CIDR allocation.

## Overview

This package provides a natural language processing layer that allows users to describe their network requirements in plain English and receive CIDR allocations.

## Features

- **Multi-provider LLM support**: Anthropic Claude, OpenAI GPT, Ollama (local)
- **Schema conversion**: Converts Zod schemas to JSON Schema for LLM tool use
- **Smart defaults**: Fills reasonable defaults for unspecified values
- **Clarification loop**: Asks follow-up questions for incomplete requirements
- **Confidence scoring**: Rates confidence in inferred values

## Installation

```bash
npm install @subnetter/nlp
```

## Usage

```typescript
import { generateFromNaturalLanguage } from '@subnetter/nlp';

const result = await generateFromNaturalLanguage(
  'I need subnets for 2 AWS accounts in us-east-1 with public and private subnets',
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514' }
);

if (result.success) {
  console.log(result.allocations);
}
```

## License

MIT


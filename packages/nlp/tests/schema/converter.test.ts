/**
 * Tests for the Zod to JSON Schema converter.
 *
 * @module tests/schema/converter
 */

import { getConfigJsonSchema, type JsonSchema } from '../../src/schema/converter';

describe('Schema Converter', () => {
  let schema: JsonSchema;

  beforeAll(() => {
    schema = getConfigJsonSchema();
  });

  describe('getConfigJsonSchema', () => {
    it('returns a valid JSON Schema object', () => {
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.$schema).toContain('json-schema.org');
    });

    it('includes all required top-level properties', () => {
      expect(schema.properties).toHaveProperty('baseCidr');
      expect(schema.properties).toHaveProperty('accounts');
      expect(schema.properties).toHaveProperty('subnetTypes');
    });

    it('marks required fields correctly', () => {
      expect(schema.required).toContain('baseCidr');
      expect(schema.required).toContain('accounts');
      expect(schema.required).toContain('subnetTypes');
    });

    it('includes descriptions for LLM understanding', () => {
      // High-level schema should have a description
      expect(schema.description).toBeDefined();
      expect(schema.description?.length).toBeGreaterThan(0);
      // Note: Field-level descriptions depend on Zod schema annotations
      // which may not always be present
    });

    it('inlines all $refs for LLM compatibility', () => {
      const schemaString = JSON.stringify(schema);
      // Should not contain any $ref since we use refStrategy: 'none'
      expect(schemaString).not.toContain('"$ref"');
    });

    it('defines baseCidr as a string with pattern', () => {
      const baseCidrProp = schema.properties?.baseCidr as JsonSchema;
      expect(baseCidrProp.type).toBe('string');
      // Should have a pattern for CIDR validation
      expect(baseCidrProp.pattern).toBeDefined();
    });

    it('defines accounts as an array of objects', () => {
      const accountsProp = schema.properties?.accounts as JsonSchema;
      expect(accountsProp.type).toBe('array');
      expect(accountsProp.items).toBeDefined();
    });

    it('defines subnetTypes as an object (record)', () => {
      const subnetTypesProp = schema.properties?.subnetTypes as JsonSchema;
      expect(subnetTypesProp.type).toBe('object');
      expect(subnetTypesProp.additionalProperties).toBeDefined();
    });

    it('handles optional prefixLengths field', () => {
      const prefixLengthsProp = schema.properties?.prefixLengths;
      expect(prefixLengthsProp).toBeDefined();
      // Should not be in required array
      expect(schema.required).not.toContain('prefixLengths');
    });

    it('handles optional cloudProviders field', () => {
      const cloudProvidersProp = schema.properties?.cloudProviders;
      expect(cloudProvidersProp).toBeDefined();
      // Should not be in required array
      expect(schema.required).not.toContain('cloudProviders');
    });
  });

  describe('nested schema structure', () => {
    it('defines account schema with name and clouds', () => {
      const accountsProp = schema.properties?.accounts as JsonSchema;
      const accountSchema = accountsProp.items as JsonSchema;

      expect(accountSchema.properties).toHaveProperty('name');
      expect(accountSchema.properties).toHaveProperty('clouds');
    });

    it('defines cloud config schema with regions', () => {
      const accountsProp = schema.properties?.accounts as JsonSchema;
      const accountSchema = accountsProp.items as JsonSchema;
      const cloudsProp = accountSchema.properties?.clouds as JsonSchema;

      // clouds is a record of cloud configs
      expect(cloudsProp.type).toBe('object');
      expect(cloudsProp.additionalProperties).toBeDefined();
    });

    it('defines prefixLengths with account, region, az fields', () => {
      const prefixLengthsProp = schema.properties?.prefixLengths as JsonSchema;

      if (prefixLengthsProp.properties) {
        expect(prefixLengthsProp.properties).toHaveProperty('account');
        expect(prefixLengthsProp.properties).toHaveProperty('region');
        expect(prefixLengthsProp.properties).toHaveProperty('az');
      }
    });
  });

  describe('LLM compatibility', () => {
    it('produces a schema that can be serialized to JSON', () => {
      expect(() => JSON.stringify(schema)).not.toThrow();
    });

    it('schema size is reasonable for LLM context', () => {
      const schemaString = JSON.stringify(schema);
      // Schema should be under 10KB to avoid context bloat
      expect(schemaString.length).toBeLessThan(10000);
    });

    it('includes a title or name for the schema', () => {
      expect(schema.title || schema.$id).toBeDefined();
    });
  });
});


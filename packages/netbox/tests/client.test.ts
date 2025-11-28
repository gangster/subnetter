/**
 * NetBox Client tests
 */

import nock from 'nock';
import { NetBoxClient, NetBoxApiError } from '../src/client/NetBoxClient';

describe('NetBoxClient', () => {
  const baseUrl = 'http://netbox.test';
  const token = 'test-token';
  let client: NetBoxClient;

  beforeEach(() => {
    client = new NetBoxClient({ url: baseUrl, token });
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('should create client with valid config', () => {
      expect(client.baseUrl).toBe(baseUrl);
    });

    it('should throw on invalid URL', () => {
      expect(() => new NetBoxClient({ url: 'not-a-url', token })).toThrow();
    });

    it('should throw on empty token', () => {
      expect(() => new NetBoxClient({ url: baseUrl, token: '' })).toThrow();
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      nock(baseUrl)
        .get('/api/status/')
        .reply(200, { 'netbox-version': '4.0.0' });

      const result = await client.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on failed connection', async () => {
      nock(baseUrl)
        .get('/api/status/')
        .reply(500);

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('prefixes', () => {
    it('should list prefixes', async () => {
      nock(baseUrl)
        .get('/api/ipam/prefixes/')
        .reply(200, {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              prefix: '10.0.0.0/8',
              status: { value: 'active', label: 'Active' },
              description: 'Test prefix',
            },
          ],
        });

      const result = await client.prefixes.list();
      expect(result.count).toBe(1);
      expect(result.results[0].prefix).toBe('10.0.0.0/8');
    });

    it('should create a prefix', async () => {
      const prefixData = {
        prefix: '10.0.0.0/24',
        status: 'reserved' as const,
        description: 'Test',
      };

      nock(baseUrl)
        .post('/api/ipam/prefixes/', prefixData)
        .reply(201, {
          id: 1,
          ...prefixData,
          status: { value: 'reserved', label: 'Reserved' },
        });

      const result = await client.prefixes.create(prefixData);
      expect(result.id).toBe(1);
      expect(result.prefix).toBe('10.0.0.0/24');
    });

    it('should find prefix by CIDR', async () => {
      nock(baseUrl)
        .get('/api/ipam/prefixes/')
        .query({ prefix: '10.0.0.0/24' })
        .reply(200, {
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 1, prefix: '10.0.0.0/24' }],
        });

      const result = await client.prefixes.findByPrefix('10.0.0.0/24');
      expect(result).not.toBeNull();
      expect(result?.prefix).toBe('10.0.0.0/24');
    });

    it('should return null for non-existent prefix', async () => {
      nock(baseUrl)
        .get('/api/ipam/prefixes/')
        .query({ prefix: '192.168.0.0/24' })
        .reply(200, {
          count: 0,
          next: null,
          previous: null,
          results: [],
        });

      const result = await client.prefixes.findByPrefix('192.168.0.0/24');
      expect(result).toBeNull();
    });
  });

  describe('tenants', () => {
    it('should list tenants', async () => {
      nock(baseUrl)
        .get('/api/tenancy/tenants/')
        .reply(200, {
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 1, name: 'production', slug: 'production' }],
        });

      const result = await client.tenants.list();
      expect(result.count).toBe(1);
      expect(result.results[0].name).toBe('production');
    });

    it('should create a tenant', async () => {
      const tenantData = {
        name: 'production',
        slug: 'production',
      };

      nock(baseUrl)
        .post('/api/tenancy/tenants/', tenantData)
        .reply(201, { id: 1, ...tenantData });

      const result = await client.tenants.create(tenantData);
      expect(result.id).toBe(1);
      expect(result.name).toBe('production');
    });
  });

  describe('sites', () => {
    it('should list sites', async () => {
      nock(baseUrl)
        .get('/api/dcim/sites/')
        .reply(200, {
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 1, name: 'us-east-1', slug: 'us-east-1' }],
        });

      const result = await client.sites.list();
      expect(result.count).toBe(1);
      expect(result.results[0].name).toBe('us-east-1');
    });
  });

  describe('roles', () => {
    it('should list roles', async () => {
      nock(baseUrl)
        .get('/api/ipam/roles/')
        .reply(200, {
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 1, name: 'Public', slug: 'public' }],
        });

      const result = await client.roles.list();
      expect(result.count).toBe(1);
      expect(result.results[0].name).toBe('Public');
    });
  });

  describe('error handling', () => {
    it('should throw NetBoxApiError on 404', async () => {
      nock(baseUrl)
        .get('/api/ipam/prefixes/999/')
        .reply(404, { detail: 'Not found.' });

      await expect(client.prefixes.get(999)).rejects.toThrow(NetBoxApiError);
    });

    it('should include status code in error', async () => {
      nock(baseUrl)
        .get('/api/ipam/prefixes/999/')
        .reply(404, { detail: 'Not found.' });

      try {
        await client.prefixes.get(999);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NetBoxApiError);
        expect((err as NetBoxApiError).statusCode).toBe(404);
      }
    });
  });
});


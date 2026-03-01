import { z } from "zod/v4";
import { router, publicProcedure } from "../trpc";
import { configSchema, CidrAllocator } from "@subnetter/core";
import type { Config } from "@subnetter/core";

export const configRouter = router({
  validate: publicProcedure
    .input(z.object({ config: z.unknown() }))
    .mutation(({ input }) => {
      const result = configSchema.safeParse(input.config);
      if (!result.success) {
        return { valid: false as const, errors: result.error.issues };
      }
      return { valid: true as const, config: result.data, errors: [] };
    }),

  analyze: publicProcedure
    .input(z.object({ config: configSchema }))
    .query(({ input }) => {
      const { config } = input;
      const allocator = new CidrAllocator(config as Config);
      const allocations = allocator.generateAllocations();

      const providers = new Set(allocations.map((a) => a.cloudProvider));
      const accounts = new Set(allocations.map((a) => a.accountName));
      const regions = new Set(allocations.map((a) => a.regionName));

      const providerCounts: Record<string, number> = {};
      for (const a of allocations) {
        providerCounts[a.cloudProvider] =
          (providerCounts[a.cloudProvider] || 0) + 1;
      }

      const totalIps = allocations.reduce((sum, a) => sum + a.usableIps, 0);

      return {
        totalSubnets: allocations.length,
        totalProviders: providers.size,
        totalAccounts: accounts.size,
        totalRegions: regions.size,
        totalIps,
        providerCounts,
      };
    }),
});

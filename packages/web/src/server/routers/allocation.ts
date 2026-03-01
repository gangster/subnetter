import { z } from "zod/v4";
import { router, publicProcedure } from "../trpc";
import {
  configSchema,
  CidrAllocator,
  validateNoOverlappingCidrs,
} from "@subnetter/core";
import type { Allocation, Config } from "@subnetter/core";

const allocationSchema: z.ZodType<Allocation> = z.object({
  accountName: z.string(),
  vpcName: z.string(),
  cloudProvider: z.string(),
  regionName: z.string(),
  availabilityZone: z.string(),
  regionCidr: z.string(),
  vpcCidr: z.string(),
  azCidr: z.string(),
  subnetCidr: z.string(),
  subnetRole: z.string(),
  usableIps: z.number(),
});

export const allocationRouter = router({
  generate: publicProcedure
    .input(z.object({ config: configSchema }))
    .mutation(({ input }) => {
      const allocator = new CidrAllocator(input.config as Config);
      const allocations = allocator.generateAllocations();
      return { allocations };
    }),

  validate: publicProcedure
    .input(z.object({ allocations: z.array(allocationSchema) }))
    .mutation(({ input }) => {
      const result = validateNoOverlappingCidrs(input.allocations);
      return result;
    }),
});

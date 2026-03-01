import { z } from "zod/v4";
import { router, publicProcedure } from "../trpc";
import { protectedProcedure } from "../middleware";
import { configs, shareLinks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { CidrAllocator, configSchema } from "@subnetter/core";
import type { Config } from "@subnetter/core";

export const shareRouter = router({
  resolve: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const linkResults = await ctx.db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.id, input.id));
      const link = linkResults[0];
      if (!link) return null;

      // Check expiry
      if (link.expiresAt && link.expiresAt < new Date()) {
        return null;
      }

      const configResults = await ctx.db
        .select()
        .from(configs)
        .where(eq(configs.id, link.configId));
      const config = configResults[0];
      if (!config) return null;

      let allocations = null;
      if (link.includeAllocations) {
        const parsed = configSchema.safeParse(JSON.parse(config.config));
        if (parsed.success) {
          const allocator = new CidrAllocator(parsed.data as Config);
          allocations = allocator.generateAllocations();
        }
      }

      return {
        name: config.name,
        config: config.config,
        allocations,
        includeAllocations: link.includeAllocations,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        configId: z.string(),
        includeAllocations: z.boolean().default(false),
        expiresInDays: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify config belongs to user
      const configResults = await ctx.db
        .select()
        .from(configs)
        .where(eq(configs.id, input.configId));
      if (!configResults[0] || configResults[0].userId !== userId) {
        return null;
      }

      const id = nanoid(10);
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86400000)
        : null;

      await ctx.db.insert(shareLinks).values({
        id,
        configId: input.configId,
        userId,
        includeAllocations: input.includeAllocations,
        expiresAt,
        createdAt: new Date(),
      });

      return { id };
    }),

  list: protectedProcedure
    .input(z.object({ configId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const results = await ctx.db
        .select()
        .from(shareLinks)
        .where(
          and(
            eq(shareLinks.configId, input.configId),
            eq(shareLinks.userId, userId)
          )
        );
      return results;
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const results = await ctx.db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.id, input.id));
      if (!results[0] || results[0].userId !== userId) {
        return { success: false };
      }
      await ctx.db.delete(shareLinks).where(eq(shareLinks.id, input.id));
      return { success: true };
    }),
});

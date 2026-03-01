import { z } from "zod/v4";
import { router } from "../trpc";
import { protectedProcedure } from "../middleware";
import { configs, configVersions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const savedConfigRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const results = await ctx.db
      .select()
      .from(configs)
      .where(eq(configs.userId, userId))
      .orderBy(desc(configs.updatedAt));
    return results;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const results = await ctx.db
        .select()
        .from(configs)
        .where(eq(configs.id, input.id));
      const config = results[0];
      if (!config || config.userId !== userId) {
        return null;
      }
      return config;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        config: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const id = nanoid();
      const now = new Date();
      await ctx.db.insert(configs).values({
        id,
        userId,
        name: input.name,
        config: input.config,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        config: z.string().optional(),
        versionMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.db
        .select()
        .from(configs)
        .where(eq(configs.id, input.id));
      if (!existing[0] || existing[0].userId !== userId) {
        return { success: false };
      }

      // Save version history if config changed
      if (input.config && input.config !== existing[0].config) {
        await ctx.db.insert(configVersions).values({
          id: nanoid(),
          configId: input.id,
          config: existing[0].config,
          createdAt: new Date(),
          message: input.versionMessage || null,
        });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name) updates.name = input.name;
      if (input.config) updates.config = input.config;

      await ctx.db
        .update(configs)
        .set(updates)
        .where(eq(configs.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.db
        .select()
        .from(configs)
        .where(eq(configs.id, input.id));
      if (!existing[0] || existing[0].userId !== userId) {
        return { success: false };
      }
      await ctx.db.delete(configs).where(eq(configs.id, input.id));
      return { success: true };
    }),
});

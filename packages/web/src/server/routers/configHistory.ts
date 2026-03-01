import { z } from "zod/v4";
import { router } from "../trpc";
import { protectedProcedure } from "../middleware";
import { configs, configVersions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const configHistoryRouter = router({
  list: protectedProcedure
    .input(z.object({ configId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify config belongs to user
      const configResults = await ctx.db
        .select()
        .from(configs)
        .where(eq(configs.id, input.configId));
      if (!configResults[0] || configResults[0].userId !== userId) {
        return [];
      }

      const versions = await ctx.db
        .select()
        .from(configVersions)
        .where(eq(configVersions.configId, input.configId))
        .orderBy(desc(configVersions.createdAt));
      return versions;
    }),

  restore: protectedProcedure
    .input(
      z.object({
        configId: z.string(),
        versionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const configResults = await ctx.db
        .select()
        .from(configs)
        .where(eq(configs.id, input.configId));
      if (!configResults[0] || configResults[0].userId !== userId) {
        return { success: false };
      }

      const versionResults = await ctx.db
        .select()
        .from(configVersions)
        .where(eq(configVersions.id, input.versionId));
      if (!versionResults[0]) {
        return { success: false };
      }

      // Save current as version before restoring
      await ctx.db.insert(configVersions).values({
        id: crypto.randomUUID(),
        configId: input.configId,
        config: configResults[0].config,
        createdAt: new Date(),
        message: "Auto-saved before restore",
      });

      await ctx.db
        .update(configs)
        .set({
          config: versionResults[0].config,
          updatedAt: new Date(),
        })
        .where(eq(configs.id, input.configId));

      return { success: true };
    }),
});

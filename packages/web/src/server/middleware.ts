import { TRPCError } from "@trpc/server";
import { publicProcedure } from "./trpc";

export const protectedProcedure = publicProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
      },
    });
  }
);

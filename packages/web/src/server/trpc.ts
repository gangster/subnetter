import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import type { Database } from "@/db";
import type { Session } from "@/lib/auth";

export type TRPCContext = {
  session: Session | null;
  db: Database;
};

export const createTRPCContext = async (opts: {
  headers: Headers;
}): Promise<TRPCContext> => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });
  return {
    session,
    db,
  };
};

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

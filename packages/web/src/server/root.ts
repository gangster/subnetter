import { router } from "./trpc";
import { configRouter } from "./routers/config";
import { allocationRouter } from "./routers/allocation";
import { savedConfigRouter } from "./routers/savedConfig";
import { configHistoryRouter } from "./routers/configHistory";
import { shareRouter } from "./routers/share";

export const appRouter = router({
  config: configRouter,
  allocation: allocationRouter,
  savedConfig: savedConfigRouter,
  configHistory: configHistoryRouter,
  share: shareRouter,
});

export type AppRouter = typeof appRouter;

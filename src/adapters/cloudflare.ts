import { type Env, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { createRequestHandler } from "react-router";
import { bindIncomingRequestSocketInfo, createGetLoadContext, importBuild } from "../helpers";
import { cache } from "../middleware";
import type { HonoServerOptionsBase, WithoutWebsocket } from "../types/hono-server-options-base";

export { createGetLoadContext };

interface HonoCloudflareOptions<E extends Env = BlankEnv>
  extends Omit<HonoServerOptionsBase<E>, "port" | "beforeAll"> {}

export type HonoServerOptions<E extends Env = BlankEnv> = HonoCloudflareOptions<E> &
  Omit<WithoutWebsocket<E>, "useWebSocket">;

/**
 * Create a Hono server
 *
 * @param config {@link HonoServerOptions} - The configuration options for the server
 */
export async function createHonoServer<E extends Env = BlankEnv>(options?: HonoServerOptions<E>) {
  const basename = import.meta.env.REACT_ROUTER_HONO_SERVER_BASENAME;
  const mergedOptions: HonoServerOptions<E> = {
    ...options,
    defaultLogger: options?.defaultLogger ?? true,
  };
  const mode = import.meta.env.MODE || "production";
  const DEV = mode === "development";
  const app = new Hono<E>(mergedOptions.app);

  /**
   * Serve public files
   */
  if (DEV) {
    const { serveStatic } = await import("@hono/node-server/serve-static");
    app.use("*", cache(60 * 60), serveStatic({ root: "./public" })); // 1 hour
    app.use(bindIncomingRequestSocketInfo());
  }

  /**
   * Add logger middleware
   */
  if (mergedOptions.defaultLogger) {
    app.use("*", logger());
  }

  /**
   * Add optional middleware
   */
  await mergedOptions.configure?.(app);

  /**
   * Create a React Router Hono app and bind it to the root Hono server using the React Router basename
   */
  const reactRouterApp = new Hono<E>({
    strict: false,
  });

  reactRouterApp.use(async (c, next) => {
    const build = await importBuild();

    return createMiddleware(async (c) => {
      const requestHandler = createRequestHandler(build, mode);
      const loadContext = mergedOptions.getLoadContext?.(c, { build, mode });
      return requestHandler(c.req.raw, loadContext instanceof Promise ? await loadContext : loadContext);
    })(c, next);
  });

  app.route(`${basename}`, reactRouterApp);

  // Patch https://github.com/remix-run/react-router/issues/12295
  if (basename) {
    app.route(`${basename}.data`, reactRouterApp);
  }

  if (DEV) {
    console.log("🚧 Running in development mode");
  }

  return app;
}

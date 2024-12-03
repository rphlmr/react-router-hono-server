import { type Env, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { type ServerBuild, createRequestHandler } from "react-router";
import { cleanUpgradeListeners, createWebSocket, patchUpgradeListener } from "../helpers";
import type { HonoServerOptionsBase, WithWebsocket, WithoutWebsocket } from "../types/hono-server-options-base";

interface HonoCloudflareOptions<E extends Env = BlankEnv> extends HonoServerOptionsBase<E> {}

type HonoServerOptionsWithWebSocket<E extends Env = BlankEnv> = HonoCloudflareOptions<E> & WithWebsocket<E>;

type HonoServerOptionsWithoutWebSocket<E extends Env = BlankEnv> = HonoCloudflareOptions<E> & WithoutWebsocket<E>;

export type HonoServerOptions<E extends Env = BlankEnv> =
  | HonoServerOptionsWithWebSocket<E>
  | HonoServerOptionsWithoutWebSocket<E>;

// export type HonoServerOptions<E extends Env = BlankEnv> = Omit<HonoServerOptionsBase<E>, "port">;

/**
 * Create a Hono server
 *
 * @param config {@link HonoServerOptions} - The configuration options for the server
 */
export async function createHonoServer<E extends Env = BlankEnv>(
  options?: HonoServerOptionsWithoutWebSocket<E>
): Promise<Hono<E>>;
export async function createHonoServer<E extends Env = BlankEnv>(
  options?: HonoServerOptionsWithWebSocket<E>
): Promise<Hono<E>>;
export async function createHonoServer<E extends Env = BlankEnv>(options?: HonoServerOptions<E>) {
  const mergedOptions: HonoServerOptions<E> = {
    ...options,
    defaultLogger: options?.defaultLogger ?? true,
  };
  const mode = import.meta.env.MODE || "production";
  const PRODUCTION = mode === "production";
  const app = new Hono<E>(mergedOptions.honoOptions || mergedOptions.app);
  const { upgradeWebSocket, injectWebSocket } = await createWebSocket({
    app,
    runtime: PRODUCTION ? "cloudflare" : "node",
    enabled: mergedOptions.useWebSocket ?? false,
  });

  /**
   * Add logger middleware
   */
  if (mergedOptions.defaultLogger) {
    app.use("*", logger());
  }

  /**
   * Add optional middleware
   */
  if (mergedOptions.configure) {
    if (mergedOptions.useWebSocket) {
      await mergedOptions.configure(app, { upgradeWebSocket });
    } else {
      await mergedOptions.configure(app);
    }
  }

  /**
   * Add React Router middleware to Hono server
   */
  app.use(async (c, next) => {
    const build: ServerBuild = (await import(
      // @ts-expect-error - Virtual module provided by React Router at build time
      "virtual:react-router/server-build"
    )) as ServerBuild;

    return createMiddleware(async (c) => {
      const requestHandler = createRequestHandler(build, mode);
      const loadContext = mergedOptions.getLoadContext?.(c, { build, mode });
      return requestHandler(c.req.raw, loadContext instanceof Promise ? await loadContext : loadContext);
    })(c, next);
  });

  if (!PRODUCTION && globalThis.__viteDevServer?.httpServer) {
    // You wonder why I'm doing this?
    // It is to make the dev server work with `hono/node-ws`
    const httpServer = globalThis.__viteDevServer.httpServer;

    // // Remove all user-defined upgrade listeners except HMR
    cleanUpgradeListeners(httpServer);

    // Bind `hono/node-ws` for you so you don't have to do it manually in `onServe`
    injectWebSocket(httpServer);

    // // Prevent user-defined upgrade listeners from upgrading `vite-hmr`
    patchUpgradeListener(httpServer);

    console.log("🚧 Running in development mode");
  }

  return app;
}

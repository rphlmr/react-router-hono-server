import type { Serve, ServeOptions } from "bun";
import { type Env, Hono } from "hono";
import { serveStatic } from "hono/bun";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { type ServerBuild, createRequestHandler } from "react-router";
import {
  bindIncomingRequestSocketInfo,
  cleanUpgradeListeners,
  createWebSocket,
  patchUpgradeListener,
} from "../helpers";
import { cache } from "../middleware";
import type { HonoServerOptionsBase, WithWebsocket, WithoutWebsocket } from "../types/hono-server-options-base";

type CustomBunServer = Serve &
  ServeOptions & {
    websocket?: unknown;
  };

interface HonoBunServerOptions<E extends Env = BlankEnv> extends HonoServerOptionsBase<E> {
  /**
   * Customize the bun server
   *
   * {@link https://bun.sh/docs/api/http#start-a-server-bun-serve}
   */
  customBunServer?: Partial<CustomBunServer>;
}

type HonoServerOptionsWithWebSocket<E extends Env = BlankEnv> = HonoBunServerOptions<E> & WithWebsocket<E>;

type HonoServerOptionsWithoutWebSocket<E extends Env = BlankEnv> = HonoBunServerOptions<E> & WithoutWebsocket<E>;

export type HonoServerOptions<E extends Env = BlankEnv> =
  | HonoServerOptionsWithWebSocket<E>
  | HonoServerOptionsWithoutWebSocket<E>;

/**
 * Create a Hono server
 *
 * @param HonoServerOptions options {@link HonoServerOptions} - The configuration options for the server
 */
export async function createHonoServer<E extends Env = BlankEnv>(
  options?: HonoServerOptionsWithoutWebSocket<E>
): Promise<CustomBunServer>;
export async function createHonoServer<E extends Env = BlankEnv>(
  options?: HonoServerOptionsWithWebSocket<E>
): Promise<CustomBunServer>;
export async function createHonoServer<E extends Env = BlankEnv>(options?: HonoServerOptions<E>) {
  const mergedOptions: HonoServerOptions<E> = {
    ...options,
    port: options?.port || Number(options?.customBunServer?.port) || Number(process.env.PORT) || 3000,
    defaultLogger: options?.defaultLogger ?? true,
  };
  const mode = import.meta.env.MODE || "production";
  const PRODUCTION = mode === "production";
  const app = new Hono<E>(mergedOptions.honoOptions || mergedOptions.app);
  const clientBuildPath = `${import.meta.env.REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY}/client`;
  const { upgradeWebSocket, injectWebSocket } = await createWebSocket({
    app,
    enabled: mergedOptions.useWebSocket ?? false,
  });

  if (!PRODUCTION) {
    app.use(bindIncomingRequestSocketInfo());
  }

  /**
   * Add optional middleware that runs before any built-in middleware, including assets serving.
   */
  await mergedOptions.beforeAll?.(app);

  /**
   * Serve assets files from build/client/assets
   */
  app.use(
    `/${import.meta.env.REACT_ROUTER_HONO_SERVER_ASSETS_DIR}/*`,
    cache(60 * 60 * 24 * 365), // 1 year
    serveStatic({ root: clientBuildPath })
  );

  /**
   * Serve public files
   */
  app.use("*", cache(60 * 60), serveStatic({ root: PRODUCTION ? clientBuildPath : "./public" })); // 1 hour

  /**
   * Add logger middleware
   */
  if (mergedOptions.defaultLogger) {
    app.use("*", logger());
  }

  /**
   * Add optional middleware
   */
  if (mergedOptions.useWebSocket) {
    await mergedOptions.configure(app, { upgradeWebSocket });
  } else {
    await mergedOptions.configure?.(app);
  }

  /**
   * Add React Router middleware to Hono server
   */

  const build = (await import(
    // @ts-expect-error - Virtual module provided by React Router at build time
    "virtual:react-router/server-build"
  )) as ServerBuild;

  app.use(async (c, next) => {
    return createMiddleware(async (c) => {
      const requestHandler = createRequestHandler(build, mode);
      const loadContext = mergedOptions.getLoadContext?.(c, { build, mode });
      return requestHandler(c.req.raw, loadContext instanceof Promise ? await loadContext : loadContext);
    })(c, next);
  });

  let server = {
    ...mergedOptions.customBunServer,
    fetch: app.fetch,
    port: mergedOptions.port,
    development: !PRODUCTION,
  };

  if (PRODUCTION) {
    server = injectWebSocket(server);
  } else if (globalThis.__viteDevServer?.httpServer) {
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

  return server;
}

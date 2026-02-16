import type { Serve } from "bun";
import { type Env, Hono } from "hono";
import { serveStatic } from "hono/bun";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { ServeStaticOptions } from "hono/serve-static";
import type { BlankEnv } from "hono/types";
import { createRequestHandler } from "react-router";
import {
  bindIncomingRequestSocketInfo,
  cleanUpgradeListeners,
  createGetLoadContext,
  createWebSocket,
  getBuildMode,
  importBuild,
  patchUpgradeListener,
} from "../helpers";
import { cache } from "../middleware";
import type { HonoServerOptionsBase, WithoutWebsocket, WithWebsocket } from "../types/hono-server-options-base";

export { createGetLoadContext };

type CustomBunServer = Serve.Options<unknown, string>;

// Module-level references for graceful shutdown
let serverInstance: ReturnType<typeof Bun.serve> | undefined;
let shutdownCallback: (() => Promise<void> | void) | undefined;

interface HonoBunServerOptions<E extends Env = BlankEnv> extends HonoServerOptionsBase<E> {
  /**
   * Customize the bun server
   *
   * {@link https://bun.sh/docs/api/http#start-a-server-bun-serve}
   */
  customBunServer?: Partial<CustomBunServer>;
  /**
   * Callback executed after server has closed and all inflight requests completed,
   * before process exit. Only applicable in production mode.
   *
   * @example
   * ```ts
   * export default createHonoServer({
   *   onGracefulShutdown: async () => {
   *     await db.close();
   *   },
   * });
   * ```
   */
  onGracefulShutdown?: () => Promise<void> | void;
  /**
   * Customize the serve static options
   */
  serveStaticOptions?: {
    /**
     * Customize the public assets (what's in your `public` directory) serve static options.
     *
     */
    publicAssets?: Omit<ServeStaticOptions<E>, "root">;
    /**
     * Customize the client assets (what's in your `build/client/assets` directory - React Router) serve static options.
     *
     */
    clientAssets?: Omit<ServeStaticOptions<E>, "root">;
  };
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
  const build = await importBuild();
  const basename = import.meta.env.REACT_ROUTER_HONO_SERVER_BASENAME;
  const mergedOptions: HonoServerOptions<E> = {
    ...options,
    port: options?.port || Number(options?.customBunServer?.port) || Number(process.env.PORT) || 3000,
    defaultLogger: options?.defaultLogger ?? true,
  };
  const mode = getBuildMode();
  const PRODUCTION = mode === "production";
  const clientBuildPath = `${import.meta.env.REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY}/client`;

  // Store the shutdown callback for use in shutdown()
  if (PRODUCTION && mergedOptions.onGracefulShutdown) {
    shutdownCallback = mergedOptions.onGracefulShutdown;
  }

  const app = new Hono<E>(mergedOptions.app);
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
    serveStatic({
      root: clientBuildPath,
      ...mergedOptions.serveStaticOptions?.clientAssets,
    })
  );

  /**
   * Serve public files
   */
  app.use(
    "*",
    cache(60 * 60), // 1 hour
    serveStatic({
      root: PRODUCTION ? clientBuildPath : "./public",
      ...mergedOptions.serveStaticOptions?.publicAssets,
    })
  );

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
   * Create a React Router Hono app and bind it to the root Hono server using the React Router basename
   */
  const reactRouterApp = new Hono<E>({
    strict: false,
  });

  reactRouterApp.use((c, next) => {
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

  let server: CustomBunServer = {
    ...mergedOptions.customBunServer,
    fetch: app.fetch,
    port: mergedOptions.port,
    development: !PRODUCTION,
  } as CustomBunServer;

  if (PRODUCTION) {
    server = injectWebSocket(server);

    // Actually start the server in production and store reference for graceful shutdown
    serverInstance = Bun.serve(server);

    console.log(`Started server: ${serverInstance.protocol}://${serverInstance.hostname}:${serverInstance.port}`);

    // Automatically register signal handlers if graceful shutdown is enabled
    if (shutdownCallback != null) {
      // Graceful shutdown handler
      let gracefulShutdownInProgress = false;
      const gracefulShutdown = async (signal: string) => {
        if (gracefulShutdownInProgress) return; // Prevent multiple invocations
        gracefulShutdownInProgress = true;
        try {
          if (serverInstance != null) {
            console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
            await serverInstance.stop(false); // false = wait for active connections to complete
            console.log("Server stopped, all requests completed");

            // Execute user's cleanup callback
            if (shutdownCallback) {
              console.log("🧹 Running cleanup tasks...");
              await shutdownCallback();
              console.log("✅ Cleanup complete!");
            }

            console.log("👋 Graceful shutdown completed");
          }
          process.exit(0);
        } catch (error) {
          console.error("❌ Shutdown failed:", error);
          process.exit(1);
        }
      };
      if (serverInstance != null) {
        // we have a server to shut down, and a callback - bind to signals
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
        console.log("✅ Graceful shutdown enabled. Press Ctrl+C to shutdown gracefully.");
      }
    }
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

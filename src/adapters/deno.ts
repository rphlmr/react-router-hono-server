import { type Env, Hono } from "hono";
import { serveStatic } from "hono/deno";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { ServeStaticOptions } from "hono/serve-static";
import type { BlankEnv } from "hono/types";
import { createRequestHandler } from "react-router";
import { bindIncomingRequestSocketInfo, createGetLoadContext, getBuildMode, importBuild } from "../helpers";
import { cache } from "../middleware";
import type { HonoServerOptionsBase, WithoutWebsocket } from "../types/hono-server-options-base";

export { createGetLoadContext };

type CustomDenoServer = Deno.ServeOptions;

let serverInstance: ReturnType<typeof Deno.serve> | undefined;
let shutdownCallback: (() => Promise<void> | void) | undefined;

interface HonoDenoServerOptions<E extends Env = BlankEnv> extends HonoServerOptionsBase<E> {
  /**
   * Customize the deno server
   *
   * {@link https://docs.deno.com/api/deno/~/Deno.serve#parameters}
   */
  customDenoServer?: Partial<CustomDenoServer>;
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

type HonoServerOptionsWithoutWebSocket<E extends Env = BlankEnv> = HonoDenoServerOptions<E> & WithoutWebsocket<E>;

export type HonoServerOptions<E extends Env = BlankEnv> = HonoDenoServerOptions<E> &
  Omit<WithoutWebsocket<E>, "useWebSocket">;

/**
 * Create a Hono server
 *
 * @param config {@link HonoServerOptions} - The configuration options for the server
 */

export async function createHonoServer<E extends Env = BlankEnv>(
  options?: HonoServerOptionsWithoutWebSocket<E>
): Promise<Hono<E>>;

export async function createHonoServer<E extends Env = BlankEnv>(options?: HonoServerOptions<E>) {
  const basename = import.meta.env.REACT_ROUTER_HONO_SERVER_BASENAME;
  const mergedOptions: HonoServerOptions<E> = {
    ...options,
    defaultLogger: options?.defaultLogger ?? true,
  };
  const mode = getBuildMode();
  const PRODUCTION = mode === "production";
  const clientBuildPath = `${import.meta.env.REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY}/client`;
  const app = new Hono<E>(mergedOptions.app);

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
    serveStatic({ root: clientBuildPath, ...mergedOptions.serveStaticOptions?.clientAssets })
  );

  /**
   * Serve public files
   */
  app.use(
    "*",
    cache(60 * 60), // 1 hour
    serveStatic({ root: PRODUCTION ? clientBuildPath : "./public", ...mergedOptions.serveStaticOptions?.publicAssets })
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

  const server: CustomDenoServer = {
    ...mergedOptions.customDenoServer,
    port: mergedOptions.port,
  } as CustomDenoServer;

  if (PRODUCTION) {
    serverInstance = Deno.serve(server, app.fetch);

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
            await serverInstance.shutdown();
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
  }

  return app;
}

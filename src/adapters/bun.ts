import type { Serve, ServeOptions } from "bun";
import { type Env, Hono } from "hono";
import { serveStatic } from "hono/bun";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { type ServerBuild, createRequestHandler } from "react-router";
import { cache } from "../middleware";
import type { HonoServerOptionsBase } from "../types/hono-server-options-base";

export interface HonoServerOptions<E extends Env = BlankEnv> extends HonoServerOptionsBase<E> {
  /**
   * Customize the bun server
   *
   * {@link https://bun.sh/docs/api/http#start-a-server-bun-serve}
   */
  customBunServer?: Serve & ServeOptions;
}

/**
 * Create a Hono server
 *
 * @param HonoServerOptions options {@link HonoServerOptions} - The configuration options for the server
 */
export async function createHonoServer<E extends Env = BlankEnv>(options: HonoServerOptions<E> = {}) {
  const mergedOptions = {
    ...options,
    port: options.port || Number(options.customBunServer?.port) || Number(process.env.PORT) || 3000,
    defaultLogger: options.defaultLogger ?? true,
  } satisfies HonoServerOptions<E>;
  const mode = import.meta.env.MODE;
  const PRODUCTION = mode === "production";
  const app = new Hono<E>(mergedOptions.honoOptions || mergedOptions.app);
  const clientBuildPath = `${import.meta.env.REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY}/client`;

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
  if (mergedOptions.configure) {
    await mergedOptions.configure(app);
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

  if (!PRODUCTION) {
    console.log("🚧 Running in development mode");
  }

  return {
    ...mergedOptions.customBunServer,
    fetch: app.fetch,
    port: mergedOptions.port,
    development: !PRODUCTION,
  } satisfies Serve;
}

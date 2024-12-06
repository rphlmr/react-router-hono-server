import { type Env, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { type ServerBuild, createRequestHandler } from "react-router";
import type { HonoServerOptionsBase, WithoutWebsocket } from "../types/hono-server-options-base";

interface HonoCloudflareOptions<E extends Env = BlankEnv> extends HonoServerOptionsBase<E> {}

export type HonoServerOptions<E extends Env = BlankEnv> = HonoCloudflareOptions<E> &
  Omit<WithoutWebsocket<E>, "useWebSocket">;

export function cache(seconds: number) {
  return createMiddleware(async (c, next) => {
    if (!c.req.path.match(/\.[a-zA-Z0-9]+$/) || c.req.path.endsWith(".data")) {
      return next();
    }

    await next();

    if (!c.res.ok) {
      return;
    }

    c.res.headers.set("cache-control", `public, max-age=${seconds}`);
  });
}

/**
 * Create a Hono server
 *
 * @param config {@link HonoServerOptions} - The configuration options for the server
 */
export async function createHonoServer<E extends Env = BlankEnv>(options?: HonoServerOptions<E>) {
  const mergedOptions: HonoServerOptions<E> = {
    ...options,
    defaultLogger: options?.defaultLogger ?? true,
  };
  const mode = import.meta.env.MODE || "production";
  const DEV = mode === "development";
  const app = new Hono<E>(mergedOptions.honoOptions || mergedOptions.app);

  /**
   * Serve public files
   */
  if (DEV) {
    const { serveStatic } = await import("@hono/node-server/serve-static");
    app.use("*", cache(60 * 60), serveStatic({ root: "./public" })); // 1 hour
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

  if (DEV) {
    console.log("🚧 Running in development mode");
  }

  return app;
}

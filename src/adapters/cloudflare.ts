import { type Env, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { type ServerBuild, createRequestHandler } from "react-router";
import type { HonoServerOptionsBase } from "../types/hono-server-options-base";

export interface HonoServerOptions<E extends Env = BlankEnv> extends Omit<HonoServerOptionsBase<E>, "port"> {}

/**
 * Create a Hono server
 *
 * @param config {@link HonoServerOptions} - The configuration options for the server
 */
export async function createHonoServer<E extends Env = BlankEnv>(options: HonoServerOptions<E> = {}) {
  const mergedOptions: HonoServerOptions<E> = {
    ...options,
    defaultLogger: options.defaultLogger ?? true,
  };
  const mode = import.meta.env.MODE;
  const PRODUCTION = mode === "production";
  const server = new Hono<E>(mergedOptions.honoOptions);

  /**
   * Add logger middleware
   */
  if (mergedOptions.defaultLogger) {
    server.use("*", logger());
  }

  /**
   * Add optional middleware
   */
  if (mergedOptions.configure) {
    await mergedOptions.configure(server);
  }

  /**
   * Add React Router middleware to Hono server
   */
  server.use(async (c, next) => {
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

  return server;
}

import { serveStatic } from "@hono/node-server/serve-static";
import { type Env, Hono } from "hono";
import { handle, streamHandle } from "hono/aws-lambda";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { createRequestHandler } from "react-router";
import { bindIncomingRequestSocketInfo, createGetLoadContext, importBuild } from "../helpers";
import { cache } from "../middleware";
import type { HonoServerOptionsBase, WithoutWebsocket } from "../types/hono-server-options-base";

export { createGetLoadContext };

type InvokeMode = "default" | "stream";

interface HonoAWSServerOptions<E extends Env = BlankEnv> extends Omit<HonoServerOptionsBase<E>, "port"> {
  /**
   * The invoke mode to use
   *
   * Defaults to `default`
   *
   * {@link https://hono.dev/docs/getting-started/aws-lambda#lambda-response-streaming}
   */
  invokeMode: InvokeMode;
}

export type HonoServerOptions<E extends Env = BlankEnv> = HonoAWSServerOptions<E> &
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
    invokeMode: options?.invokeMode ?? "default",
    defaultLogger: options?.defaultLogger ?? true,
  };
  const mode = import.meta.env.MODE || "production";
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
   * In production, you may use CloudFront or any other AWS services to serve assets
   */
  if (!PRODUCTION) {
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
    app.use(
      "*",
      cache(60 * 60), // 1 hour
      serveStatic({ root: PRODUCTION ? clientBuildPath : "./public" })
    );
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

  /**
   * Wrap the app in the appropriate AWS handler
   */
  if (PRODUCTION) {
    if (mergedOptions.invokeMode === "stream") {
      return streamHandle(app);
    }

    return handle(app);
  }

  console.log("🚧 Dev server started");

  return app;
}

import type { Fetcher, RequestInit } from "@cloudflare/workers-types";
import { type Context, type Env, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { createRequestHandler } from "react-router";
import {
  bindIncomingRequestSocketInfo,
  cacheOnFound,
  createGetLoadContext,
  getBuildMode,
  importBuild,
} from "../helpers";
import type { HonoServerOptionsBase, WithoutWebsocket } from "../types/hono-server-options-base";

export { createGetLoadContext };

interface HonoCloudflareOptions<E extends Env = BlankEnv> extends Omit<HonoServerOptionsBase<E>, "port"> {}

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
  const mode = getBuildMode();
  const PRODUCTION = mode === "production";
  const app = new Hono<E>(mergedOptions.app);

  /**
   * Add optional middleware that runs before any built-in middleware, including assets serving.
   */
  await mergedOptions.beforeAll?.(app);

  /**
   * Serve assets files from build/client/assets
   */
  app.use(
    // https://developers.cloudflare.com/workers/static-assets/binding/#experimental_serve_directly
    `/${import.meta.env.REACT_ROUTER_HONO_SERVER_ASSETS_DIR}/*`,
    serveCloudflareAssets(cacheOnFound(!PRODUCTION ? 0 : 60 * 60 * 24 * 365)) // 1 year
  );

  /**
   * Serve public files
   */
  if (PRODUCTION) {
    app.use(
      // https://developers.cloudflare.com/workers/static-assets/binding/#experimental_serve_directly
      "*",
      serveCloudflareAssets(cacheOnFound(!PRODUCTION ? 0 : 60 * 60)) // 1 hour
    );
  } else {
    const { serveStatic } = await import("@hono/node-server/serve-static");
    app.use("*", serveStatic({ root: "./public", onFound: cacheOnFound(!PRODUCTION ? 0 : 60 * 60) }));
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

  if (!PRODUCTION) {
    console.log("🚧 Running in development mode");
  }

  return app;
}

let warned = false;

/**
 * Serve static assets
 *
 * https://github.com/sergiodxa/remix-hono/blob/main/src/cloudflare.ts
 */
function serveCloudflareAssets(onFound?: (path: string, c: Context<any>) => void) {
  return createMiddleware(async (c, next) => {
    const binding = c.env?.ASSETS as Fetcher | undefined;

    if (!binding) {
      if (!warned) {
        console.info(
          "\x1b[33m\nThe binding ASSETS is not set. Falling back to Cloudflare serving.\nhttps://developers.cloudflare.com/workers/static-assets/binding/#binding\n\x1b[0m"
        );
      }
      warned = true;
      return next();
    }

    try {
      let response = (await binding.fetch(
        c.req.url,
        c.req.raw.clone() as unknown as RequestInit
      )) as unknown as globalThis.Response;

      // If the request failed, we just call the next middleware
      if (response.status >= 400) {
        return next();
      }

      onFound?.(c.req.url, c);

      response = new Response(
        response.body,
        // As onFound only changes the headers, we just need to merge the headers
        Object.assign(response, { headers: Object.assign(response.headers, c.res.headers) })
      );

      return response;
    } catch {
      return next();
    }
  });
}

import type { AddressInfo } from "node:net";
import { type ServerType, serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { type Env, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { type ServerBuild, createRequestHandler } from "react-router";
import { cache } from "../middleware";
import type { HonoServerOptionsBase } from "../types/hono-server-options-base";
import type { CreateNodeServerOptions } from "../types/node.https";

export type HonoServerOptions<E extends Env = BlankEnv> = HonoServerOptionsBase<E> & {
  /**
   * Listening listener (production mode only)
   *
   * It is called when the server is listening
   *
   * Defaults log the port
   */
  listeningListener?: (info: AddressInfo) => void;
  /**
   * Customize the node server (ex: using http2)
   *
   * {@link https://hono.dev/docs/getting-started/nodejs#http2}
   */
  customNodeServer?: CreateNodeServerOptions;
  /**
   * Callback executed just after `serve` from `@hono/node-server`
   *
   * **Only applied to production mode**
   *
   * For example, you can use this to bind `@hono/node-ws`'s `injectWebSocket`
   */
  onServe?: (server: ServerType) => void;
};

/**
 * Create a Hono server
 *
 * @param config {@link HonoServerOptions} - The configuration options for the server
 */
export async function createHonoServer<E extends Env = BlankEnv>(options: HonoServerOptions<E> = {}) {
  const mergedOptions: HonoServerOptions<E> = {
    listeningListener: (info) => {
      console.log(`🚀 Server started on port ${info.port}`);
      console.log(`🌍 http://127.0.0.1:${info.port}`);
    },
    ...options,
    port: options.port || Number(process.env.PORT) || 3000,
    defaultLogger: options.defaultLogger ?? true,
  };
  const mode = import.meta.env?.MODE;
  const PRODUCTION = mode === "production";
  const app = new Hono<E>(mergedOptions.honoOptions || mergedOptions.app);
  const clientBuildPath = `${import.meta.env?.REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY}/client`;

  /**
   * Serve assets files from build/client/assets
   */
  app.use(
    `/${import.meta.env?.REACT_ROUTER_HONO_SERVER_ASSETS_DIR}/*`,
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

  /**
   * Start the production server
   */
  if (PRODUCTION) {
    const server = serve(
      {
        ...app,
        ...mergedOptions.customNodeServer,
        port: mergedOptions.port,
      },
      mergedOptions.listeningListener
    );
    mergedOptions.onServe?.(server);
  } else {
    // You wonder why I'm doing this?
    // It is to make the dev server work with `hono/node-ws`
    const viteDevServer = globalThis.__viteDevServer;

    if (!viteDevServer?.httpServer) {
      return;
    }

    // Remove all user-defined upgrade listeners except HMR
    cleanUpgradeListeners(viteDevServer.httpServer);

    // Execute your onServe callback
    mergedOptions.onServe?.(viteDevServer.httpServer);

    // Prevent user-defined upgrade listeners from upgrading `vite-hmr`
    patchUpgradeListener(viteDevServer.httpServer);

    console.log("🚧 Dev server started");
  }

  return app;
}

/**
 * Clean all user-defined upgrade listeners, except HMR
 *
 * Avoid conflicts on `already upgraded connections` when using `@hono/node-ws` on dev
 *
 */
function cleanUpgradeListeners(httpServer: ServerType) {
  const upgradeListeners = httpServer
    .listeners("upgrade")
    .filter((listener) => listener.name !== "hmrServerWsListener");

  for (const listener of upgradeListeners) {
    httpServer.removeListener(
      "upgrade",
      /* @ts-ignore - we don't care */
      listener
    );
  }
}

/**
 * Patch all user-defined upgrade listeners, except HMR
 *
 * Avoid upgrading `vite-hmr` if `upgrade` listeners are added to the `httpServer` through `onServe` callback
 *
 */
function patchUpgradeListener(httpServer: ServerType) {
  const upgradeListeners = httpServer
    .listeners("upgrade")
    .filter((listener) => listener.name !== "hmrServerWsListener");

  for (const listener of upgradeListeners) {
    // remove the original listener
    httpServer.removeListener(
      "upgrade",
      /* @ts-ignore - we don't care */
      listener
    );

    // re-add the listener back, filtering out `vite-hmr`
    httpServer.on("upgrade", (request, ...rest) => {
      if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
        return;
      }

      return listener(request, ...rest);
    });
  }
}

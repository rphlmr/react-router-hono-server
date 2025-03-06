import type { AddressInfo } from "node:net";
import { type ServerType, serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { type Env, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { logger } from "hono/logger";
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
import type { HonoServerOptionsBase, WithWebsocket, WithoutWebsocket } from "../types/hono-server-options-base";
import type { CreateNodeServerOptions } from "../types/node.https";

export { createGetLoadContext };

interface HonoNodeServerOptions<E extends Env = BlankEnv> extends HonoServerOptionsBase<E> {
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
   */
  onServe?: (server: ServerType) => void;
  /**
   * The Node.js Adapter rewrites the global Request/Response and uses a lightweight Request/Response to improve performance.
   *
   * If you this behavior, set it to `true`
   *
   * 🚨 Setting this to `true` can break `request.clone()` if you later check `instanceof Request`.
   *
   * {@link https://github.com/honojs/node-server?tab=readme-ov-file#overrideglobalobjects}
   *
   * @default false
   */
  overrideGlobalObjects?: boolean;
}

type HonoServerOptionsWithWebSocket<E extends Env = BlankEnv> = HonoNodeServerOptions<E> & WithWebsocket<E>;

type HonoServerOptionsWithoutWebSocket<E extends Env = BlankEnv> = HonoNodeServerOptions<E> & WithoutWebsocket<E>;

export type HonoServerOptions<E extends Env = BlankEnv> =
  | HonoServerOptionsWithWebSocket<E>
  | HonoServerOptionsWithoutWebSocket<E>;

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
  const basename = import.meta.env.REACT_ROUTER_HONO_SERVER_BASENAME;
  const mergedOptions: HonoServerOptions<E> = {
    ...options,
    listeningListener:
      options?.listeningListener ||
      ((info) => {
        console.log(`🚀 Server started on port ${info.port}`);
        console.log(`🌍 http://127.0.0.1:${info.port}`);

        if (basename !== "/") {
          console.log(`🔗 http://127.0.0.1:${info.port}${basename}`);
        }
      }),
    port: options?.port || Number(process.env.PORT) || 3000,
    defaultLogger: options?.defaultLogger ?? true,
    overrideGlobalObjects: options?.overrideGlobalObjects ?? false,
  };
  const mode = getBuildMode();
  const PRODUCTION = mode === "production";
  const clientBuildPath = `${import.meta.env.REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY}/client`;
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
   * Start the production server
   */
  if (PRODUCTION) {
    const server = serve(
      {
        ...app,
        ...mergedOptions.customNodeServer,
        port: mergedOptions.port,
        overrideGlobalObjects: mergedOptions.overrideGlobalObjects,
      },
      mergedOptions.listeningListener
    );
    // Execute your onServe callback. Use case: socket.io binding
    mergedOptions.onServe?.(server);

    // Bind `hono/node-ws` for you so you don't have to do it manually in `onServe`
    injectWebSocket(server);
  } else if (globalThis.__viteDevServer?.httpServer) {
    // You wonder why I'm doing this?
    // It is to make the dev server work with `hono/node-ws`
    const httpServer = globalThis.__viteDevServer.httpServer;

    // Remove all user-defined upgrade listeners except HMR
    cleanUpgradeListeners(httpServer);

    // Execute your onServe callback. Use case: socket.io binding
    mergedOptions.onServe?.(httpServer);

    // Bind `hono/node-ws` for you so you don't have to do it manually in `onServe`
    injectWebSocket(httpServer);

    // Prevent user-defined upgrade listeners from upgrading `vite-hmr`
    patchUpgradeListener(httpServer);

    console.log("🚧 Dev server started");
  }

  return app;
}

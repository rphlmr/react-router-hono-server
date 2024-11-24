import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { type Context, type Env, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { HonoOptions } from "hono/hono-base";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { type AppLoadContext, type ServerBuild, createRequestHandler } from "react-router";
import { cache } from "./middleware";
import type { CreateNodeServerOptions } from "./types/node.https";
import { getMode } from "./utils";
export type HonoServerOptions<E extends Env = BlankEnv> = {
  /**
   * The build module to use
   *
   * Use
   * ```ts
   import(
      //@ts-expect-error virtual module provided by React Router at build time
      "virtual:react-router/server-build"
    )
   * ```
   */
  build: Promise<ServerBuild>;
  /**
   * Enable the default logger
   *
   * Defaults to `true`
   */
  defaultLogger?: boolean;
  /**
   * The port to start the server on
   *
   * Defaults to `process.env.PORT || 3000`
   */
  port?: number;
  /**
   * The directory where the server build files are located (defined in vite.config)
   *
   * Defaults to `build`
   *
   * See https://remix.run/docs/en/main/file-conventions/vite-config#builddirectory
   */
  buildDirectory?: string;
  /**
   * The directory where the assets are located (defined in vite.config, build.assetsDir)
   *
   * Defaults to `assets`
   *
   * See https://vitejs.dev/config/build-options#build-assetsdir
   */
  assetsDir?: string;
  /**
   * Customize the Hono server, for example, adding middleware
   *
   * It is applied after the default middleware and before the React Router middleware
   */
  configure?: <E extends Env = BlankEnv>(server: Hono<E>) => Promise<void> | void;
  /**
   * Augment the React Router AppLoadContext
   *
   * Don't forget to declare the AppLoadContext in your app, next to where you create the Hono server
   *
   * ```ts
   * declare module "react-router" {
   *   interface AppLoadContext {
   *     // Add your custom context here
   *     whatever: string;
   *   }
   * }
   * ```
   */
  getLoadContext?: (
    c: Context,
    options: {
      build: ServerBuild;
      mode: "development" | "production" | "test";
    }
  ) => Promise<AppLoadContext> | AppLoadContext;
  /**
   * Listening listener (production mode only)
   *
   * It is called when the server is listening
   *
   * Defaults log the port
   */
  listeningListener?: (info: AddressInfo) => void;
  /**
   * Hono constructor options
   *
   * {@link HonoOptions}
   */
  honoOptions?: HonoOptions<E>;
  /**
   * Customize the node server (ex: using http2)
   *
   * {@link https://hono.dev/docs/getting-started/nodejs#http2}
   */
  customNodeServer?: CreateNodeServerOptions;
};

const defaultOptions: Omit<HonoServerOptions<BlankEnv>, "build"> = {
  defaultLogger: true,
  port: Number(process.env.PORT) || 3000,
  buildDirectory: "build",
  assetsDir: "assets",
  listeningListener: (info) => {
    console.log(`🚀 Server started on port ${info.port}`);
    console.log(`🌍 http://127.0.0.1:${info.port}`);
  },
  getLoadContext() {
    return {};
  },
};

/**
 * Create a Hono server
 *
 * @param config {@link HonoServerOptions} - The configuration options for the server
 */
export async function createHonoServer<E extends Env = BlankEnv>(options: HonoServerOptions<E>) {
  const mergedOptions: HonoServerOptions<E> = {
    ...defaultOptions,
    ...options,
    defaultLogger: options.defaultLogger ?? true,
  };

  const mode = getMode();
  const PRODUCTION = mode === "production";

  const server = new Hono<E>(mergedOptions.honoOptions);

  const clientBuildPath = `./${mergedOptions.buildDirectory}/client`;

  /**
   * Serve assets files from build/client/assets
   */
  server.use(
    `/${mergedOptions.assetsDir}/*`,
    cache(60 * 60 * 24 * 365), // 1 year
    serveStatic({ root: clientBuildPath })
  );

  /**
   * Serve public files
   */
  server.use("*", cache(60 * 60), serveStatic({ root: PRODUCTION ? clientBuildPath : "./public" })); // 1 hour

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
    const build = await mergedOptions.build;
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
    serve(
      {
        ...server,
        ...mergedOptions.customNodeServer,
        port: mergedOptions.port,
      },
      mergedOptions.listeningListener
    );
  } else {
    console.log("🚧 Dev server started");
  }

  return server;
}

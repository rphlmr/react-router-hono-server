import type { ServerOptions as ServerOptions$1, createServer } from "node:http";
import type {
  SecureServerOptions,
  ServerOptions as ServerOptions$3,
  createSecureServer,
  createServer as createServer$2,
} from "node:http2";
import type { ServerOptions as ServerOptions$2, createServer as createServer$1 } from "node:https";
import type { AddressInfo } from "node:net";
import path from "node:path";
import url from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import { type Context, type Env, Hono } from "hono";
import type { HonoOptions } from "hono/hono-base";
import { logger } from "hono/logger";
import type { BlankEnv } from "hono/types";
import { type RemixMiddlewareOptions, remix } from "remix-hono/handler";

import { importDevBuild } from "./dev-build";
import { cache } from "./middleware";

type createHttpOptions = {
  serverOptions?: ServerOptions$1;
  createServer?: typeof createServer;
};
type createHttpsOptions = {
  serverOptions?: ServerOptions$2;
  createServer?: typeof createServer$1;
};
type createHttp2Options = {
  serverOptions?: ServerOptions$3;
  createServer?: typeof createServer$2;
};
type createSecureHttp2Options = {
  serverOptions?: SecureServerOptions;
  createServer?: typeof createSecureServer;
};
type CreateNodeServerOptions = createHttpOptions | createHttpsOptions | createHttp2Options | createSecureHttp2Options;

export type HonoServerOptions<E extends Env = BlankEnv> = {
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
   * The file name of the server build file (defined in vite.config)
   *
   * Defaults to `index.js`
   *
   * See https://remix.run/docs/en/main/file-conventions/vite-config#serverbuildfile
   */
  serverBuildFile?: `${string}.js`;
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
   * It is applied after the default middleware and before the remix middleware
   */
  configure?: <E extends Env = BlankEnv>(server: Hono<E>) => Promise<void> | void;
  /**
   * Augment the Remix AppLoadContext
   *
   * Don't forget to declare the AppLoadContext in your app, next to where you create the Hono server
   *
   * ```ts
   * declare module "@remix-run/node" {
   *   interface AppLoadContext {
   *     // Add your custom context here
   *   }
   * }
   * ```
   */
  getLoadContext?: (
    c: Context,
    options: Pick<RemixMiddlewareOptions, "build" | "mode">
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

const defaultOptions: HonoServerOptions<BlankEnv> = {
  defaultLogger: true,
  port: Number(process.env.PORT) || 3000,
  buildDirectory: "build",
  serverBuildFile: "index.js",
  assetsDir: "assets",
  listeningListener: (info) => {
    console.log(`🚀 Server started on port ${info.port}`);
  },
};

/**
 * Create a Hono server
 *
 * @param config {@link HonoServerOptions} - The configuration options for the server
 */
export async function createHonoServer<E extends Env = BlankEnv>(options: HonoServerOptions<E> = {}) {
  const mergedOptions: HonoServerOptions<E> = {
    ...defaultOptions,
    ...options,
    defaultLogger: options.defaultLogger ?? true,
  };

  const mode = process.env.NODE_ENV === "test" ? "development" : process.env.NODE_ENV;

  const isProductionMode = mode === "production";

  const server = new Hono<E>(mergedOptions.honoOptions);

  const serverBuildPath = `./${mergedOptions.buildDirectory}/server`;

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
  server.use("*", cache(60 * 60), serveStatic({ root: isProductionMode ? clientBuildPath : "./public" })); // 1 hour

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
   * Add remix middleware to Hono server
   */
  server.use(async (c, next) => {
    const build = (
      isProductionMode
        ? await import(
            /* @vite-ignore */
            url
              .pathToFileURL(
                path.resolve(path.join(process.cwd(), `${serverBuildPath}/${mergedOptions.serverBuildFile}`))
              )
              .toString()
          )
        : await importDevBuild()
    ) as ServerBuild;

    return remix({
      build,
      mode,
      getLoadContext(c) {
        if (!mergedOptions.getLoadContext) {
          return {};
        }
        return mergedOptions.getLoadContext(c, { build });
      },
    })(c, next);
  });

  /**
   * Start the production server
   */

  if (isProductionMode) {
    serve(
      {
        ...server,
        ...mergedOptions.customNodeServer,
        port: mergedOptions.port,
      },
      mergedOptions.listeningListener
    );
  }

  return server;
}

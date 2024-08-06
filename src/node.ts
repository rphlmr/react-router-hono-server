import path from "node:path";
import url from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import { type Context, Hono } from "hono";
import { logger } from "hono/logger";
import { type RemixMiddlewareOptions, remix } from "remix-hono/handler";
import { importDevBuild } from "./dev-build";
import { cache } from "./middlewares";

export type HonoServerOptions = {
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
   * Defaults to `build/server`
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
   * Customize the Hono server, for example, adding middlewares
   *
   * It is applied after the default middlewares and before the remix middleware
   */
  configure?: (server: Hono) => Promise<void> | void;
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
  listeningListener?: (info: { port: number }) => void;
};

const defaultOptions: HonoServerOptions = {
  defaultLogger: true,
  port: Number(process.env.PORT) || 3000,
  buildDirectory: "build/server",
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
export async function createHonoServer(options: HonoServerOptions = {}) {
  const mergedOptions: HonoServerOptions = {
    ...defaultOptions,
    ...options,
    defaultLogger: options.defaultLogger ?? true,
  };

  const mode = process.env.NODE_ENV === "test" ? "development" : process.env.NODE_ENV;

  const isProductionMode = mode === "production";

  const server = new Hono();

  /**
   * Serve assets files from build/client/assets
   */
  server.use(
    `/${mergedOptions.assetsDir}/*`,
    cache(60 * 60 * 24 * 365), // 1 year
    serveStatic({ root: "./build/client" })
  );

  /**
   * Serve public files
   */
  server.use("*", cache(60 * 60), serveStatic({ root: isProductionMode ? "./build/client" : "./public" })); // 1 hour

  /**
   * Add logger middleware
   */
  if (mergedOptions.defaultLogger) {
    server.use("*", logger());
  }

  /**
   * Add optional middlewares
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
                path.resolve(
                  path.join(process.cwd(), `./${mergedOptions.buildDirectory}/${mergedOptions.serverBuildFile}`)
                )
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
        port: mergedOptions.port,
      },
      mergedOptions.listeningListener
    );
  }

  return server;
}

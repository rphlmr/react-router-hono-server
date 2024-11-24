import honoDevServer from "@hono/vite-dev-server";

type HonoDevServerOptions = {
  /**
   * The path to the `app` directory, relative to `vite.config.ts`.
   *
   * Defaults to `app`.
   */
  appDirectory?: string;
  /**
   * The path to the server file, relative to `vite.config.ts`.
   *
   * If it is a folder (`app/server`), it will look for an `index.ts` file.
   *
   * Defaults to `${appDirectory}/server[.ts | /index.ts]`.
   */
  entry?: string;
  /**
   * The paths that are not served by the dev-server.
   *
   * Defaults include `appDirectory` content.
   */
  exclude?: (string | RegExp)[];
};

/**
 * Create a dev server for the Hono server
 *
 * @param options {@link HonoDevServerOptions} - The configuration options for the dev server
 */
export function devServer(options?: HonoDevServerOptions) {
  const appDirectory = options?.appDirectory || "app";
  const mergedOptions: Required<HonoDevServerOptions> = {
    entry: `${appDirectory}/server`,
    appDirectory,
    exclude: [],
    ...options,
  };

  return honoDevServer({
    injectClientScript: false,
    entry: mergedOptions.entry,
    export: "default",
    exclude: [
      `/${mergedOptions.appDirectory}/**/*`,
      `/${mergedOptions.appDirectory}/**/.*/**`,
      /^\/@.+$/,
      /^\/node_modules\/.*/,
      /\?import$/,
      ...mergedOptions.exclude,
    ],
  });
}

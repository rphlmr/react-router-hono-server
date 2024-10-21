import honoDevServer from "@hono/vite-dev-server";

type HonoDevServerOptions = {
  /**
   * The path to the `app` directory, relative to `vite.config.ts`.
   *
   * Defaults to `"app"`.
   */
  appDirectory?: string;
  /**
   * The path to the entry file, relative to `vite.config.ts`.
   *
   * Defaults to `"app/entry.server.tsx"`.
   */
  entry?: string;
  /**
   * The name of the export from the entry file.
   *
   * Defaults to `server`. If you are using export default, use `default`
   *
   * @example
   * ```ts
   * export const server = createHonoServer();
   * ```
   */
  exportName?: string;
  /**
   * The paths that are not served by the dev-server.
   *
   * Defaults include `appDirectory` content.
   */
  exclude?: (string | RegExp)[];
};

const defaultConfig: Required<HonoDevServerOptions> = {
  entry: "app/entry.server.tsx",
  exportName: "server",
  appDirectory: "app",
  exclude: [],
};

/**
 * Create a dev server for the Hono server
 *
 * @param config {@link HonoDevServerOptions} - The configuration options for the dev server
 */
export function devServer(config?: HonoDevServerOptions) {
  const mergedConfig = { ...defaultConfig, ...config };
  return honoDevServer({
    injectClientScript: false,
    entry: mergedConfig.entry, // The file path of your server.
    export: mergedConfig.exportName,
    exclude: [
      `/${mergedConfig.appDirectory}/**/*`,
      `/${mergedConfig.appDirectory}/**/.*/**`,
      /^\/@.+$/,
      /^\/node_modules\/.*/,
      /\?import$/,
      ...mergedConfig.exclude,
    ],
  });
}

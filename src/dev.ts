import fs from "node:fs";
import path from "node:path";
import honoDevServer from "@hono/vite-dev-server";
import type { Config as ReactRouterConfig } from "@react-router/dev/config";
import type { Plugin, UserConfig } from "vite";
import type { MetaEnv } from "./utils";

interface ReactRouterHonoServerDevServerOptions {
  /**
   * The paths that are not served by the dev-server.
   *
   * Defaults include `appDirectory` content.
   */
  exclude?: (string | RegExp)[];
}

interface ReactRouterHonoServerPluginOptions {
  /**
   * The path to the server file, relative to `vite.config.ts`.
   *
   * If it is a folder (`app/server`), it will look for an `index.ts` file.
   *
   * Defaults to `${appDirectory}/server[.ts | /index.ts]`.
   */
  serverEntryPoint?: string;
  /**
   * The paths that are not served by the dev-server.
   *
   * Defaults include `appDirectory` content.
   */
  dev?: ReactRouterHonoServerDevServerOptions;
}

export function reactRouterHonoServer(options: ReactRouterHonoServerPluginOptions = {}): Plugin {
  let pluginConfig: PluginConfig;
  let devServerPlugin: Plugin | undefined;

  return {
    name: "react-router-hono-server",
    enforce: "post",
    config(config) {
      pluginConfig = resolvePluginConfig(config, options);

      if (!pluginConfig) {
        return;
      }

      const baseConfig = {
        // Define environment variables that are hot-swapped during development and SSR build
        define: {
          "import.meta.env.REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY": JSON.stringify(pluginConfig.buildDirectory),
          "import.meta.env.REACT_ROUTER_HONO_SERVER_ASSETS_DIR": JSON.stringify(pluginConfig.assetsDir),
        } satisfies MetaEnv<ReactRouterHonoServerEnv>,
        ssr: {
          // Ensure our package is not externalized during SSR build
          // This is necessary because we are using a virtual import to load the React Router server entry point
          noExternal: ["react-router-hono-server"],
        },
      } satisfies UserConfig;

      if (!pluginConfig.isSsrBuild) {
        return baseConfig;
      }

      return {
        ...baseConfig,
        build: {
          target: "esnext",
          rollupOptions: {
            input: pluginConfig.serverEntryPoint,
          },
        },
      };
    },
    configureServer(server) {
      if (!pluginConfig) {
        return;
      }

      if (devServerPlugin) {
        return;
      }

      // Create and apply the Hono dev server plugin
      devServerPlugin = honoDevServer({
        injectClientScript: false,
        entry: pluginConfig.serverEntryPoint,
        export: "default",
        exclude: [
          `/${pluginConfig.appDirectory}/**/*`,
          `/${pluginConfig.appDirectory}/**/.*/**`,
          /^\/@.+$/,
          /^\/node_modules\/.*/,
          /\?import$/,
          ...(pluginConfig.dev?.exclude || []),
        ],
      });

      // Apply the dev server plugin's configureServer hook if it exists
      if (typeof devServerPlugin.configureServer === "function") {
        devServerPlugin.configureServer(server);
      } else {
        console.error("Dev server plugin configureServer hook is not a function. This is likely a bug, I guess 😅\n");
        throw new Error("Cannot apply dev server plugin configureServer hook");
      }
    },
  };
}

type ReactRouterPluginContext = {
  reactRouterConfig: Required<ReactRouterConfig>;
  rootDirectory: string;
  entryClientFilePath: string;
  entryServerFilePath: string;
  isSsrBuild: true;
};

function resolvePluginConfig(config: UserConfig, options: ReactRouterHonoServerPluginOptions) {
  if (!("__reactRouterPluginContext" in config)) {
    return null;
  }

  const reactRouterConfig = config.__reactRouterPluginContext as ReactRouterPluginContext;
  const rootDirectory = reactRouterConfig.rootDirectory;
  const buildDirectory = path.relative(rootDirectory, reactRouterConfig.reactRouterConfig.buildDirectory);
  const appDirectory = path.relative(rootDirectory, reactRouterConfig.reactRouterConfig.appDirectory);
  const isSsrBuild = reactRouterConfig.isSsrBuild;
  const assetsDir = config.build?.assetsDir || "assets";
  const serverEntryPoint = options.serverEntryPoint || findDefaultServerEntry(appDirectory);

  return {
    rootDirectory,
    buildDirectory,
    appDirectory,
    isSsrBuild,
    assetsDir,
    serverEntryPoint,
    dev: options.dev,
  };
}

type PluginConfig = ReturnType<typeof resolvePluginConfig>;

function findDefaultServerEntry(appDirectory: string): string {
  const fileWay = `${appDirectory}/server.ts`;
  const folderWay = `${appDirectory}/server/index.ts`;

  // Check if direct file exists
  if (fs.existsSync(fileWay)) {
    return fileWay;
  }

  // Check if index file exists
  if (fs.existsSync(folderWay)) {
    return folderWay;
  }

  // If neither exists, throw an error
  console.error(
    `Could not find server entry point.\nDid you forget to create it or are you using a custom server entry point?\Expected either:\n - ${fileWay}\n - ${folderWay}\nOr set the \`serverEntryPoint\` option in the plugin options.\n`
  );
  throw new Error("Unable to start dev server. Server entry point not found.");
}

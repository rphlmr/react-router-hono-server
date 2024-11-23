import fs from "node:fs";
import { reactRouter } from "@react-router/dev/vite";
import esbuild from "esbuild";
import { devServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    target: "esnext",
    rollupOptions: isSsrBuild
      ? {
          input: "./server/index.ts",
        }
      : undefined,
  },
  plugins: [
    devServer({
      entry: "./server/index.ts",
    }),
    reactRouter(
      // For Sentry instrumentation
      // https://docs.sentry.io/platforms/javascript/guides/remix/manual-setup/#custom-express-server
      // buildEnd: async ({ remixConfig }) => {
      //   const sentryInstrument = `instrument.server`;
      //   await esbuild
      //     .build({
      //       alias: {
      //         "~": "./app",
      //       },
      //       outdir: `${remixConfig.buildDirectory}/server`,
      //       entryPoints: [`${remixConfig.appDirectory}/server/${sentryInstrument}.ts`],
      //       platform: "node",
      //       format: "esm",
      //       // Don't include node_modules in the bundle
      //       packages: "external",
      //       bundle: true,
      //       logLevel: "info",
      //     })
      //     .then(() => {
      //       const serverBuildPath = `${remixConfig.buildDirectory}/server/${remixConfig.serverBuildFile}`;
      //       fs.writeFileSync(
      //         serverBuildPath,
      //         Buffer.concat([
      //           Buffer.from(`import "./${sentryInstrument}.js"\n`),
      //           Buffer.from(fs.readFileSync(serverBuildPath)),
      //         ])
      //       );
      //     })
      //     .catch((error: unknown) => {
      //       console.error(error);
      //       process.exit(1);
      //     });
      // },
    ),
    tsconfigPaths(),
  ],
}));

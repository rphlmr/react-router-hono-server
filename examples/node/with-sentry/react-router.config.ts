import fs from "node:fs";
import type { Config } from "@react-router/dev/config";
import esbuild from "esbuild";

export default {
  buildEnd: async ({ reactRouterConfig }) => {
    const sentryInstrument = `instrument.server`;
    await esbuild
      .build({
        alias: {
          "~": `./app`,
        },
        outdir: `${reactRouterConfig.buildDirectory}/server`,
        entryPoints: [`./app/server/${sentryInstrument}.ts`],
        platform: "node",
        format: "esm",
        // Don't include node_modules in the bundle
        packages: "external",
        bundle: true,
        logLevel: "info",
      })
      .then(() => {
        const serverBuildPath = `${reactRouterConfig.buildDirectory}/server/${reactRouterConfig.serverBuildFile}`;
        fs.writeFileSync(
          serverBuildPath,
          Buffer.concat([
            Buffer.from(`import "./${sentryInstrument}.js"\n`),
            Buffer.from(fs.readFileSync(serverBuildPath)),
          ])
        );
      })
      .catch((error: unknown) => {
        console.error(error);
        process.exit(1);
      });
  },
} satisfies Config;

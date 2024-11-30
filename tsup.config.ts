import fs from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "src/adapters/node.ts",
      "src/adapters/bun.ts",
      "src/adapters/cloudflare.ts",
      "src/dev.ts",
      "src/middleware.ts",
    ],
    outDir: "dist",
    format: ["esm"],
    clean: true,
    dts: true,
    external: [
      // virtual module provided by React Router at build time
      "virtual:react-router/server-build",
    ],
    onSuccess: async () => {
      copyBuild("react-router");
      copyBuild("react-router-bun");
      copyBuild("react-router-cloudflare");
      copyBuild("react-router-virtual");
      copyBuild("react-router-session");
      copyBuild("react-router-websocket");
    },
  },
  {
    entry: ["src/cli.ts"],
    outDir: "dist",
    format: ["esm"],
    onSuccess: async () => {
      const banner = "#!/usr/bin/env node\n";
      const cliFilePath = "dist/cli.mjs";
      const originalContent = fs.readFileSync(cliFilePath, "utf-8");
      fs.writeFileSync(cliFilePath, banner + originalContent);
      fs.chmodSync(cliFilePath, "755");
      fs.cpSync("dist", "examples/react-router/node_modules/react-router-hono-server/dist", {
        recursive: true,
        force: true,
      });
      fs.cpSync("dist", "examples/react-router-virtual/node_modules/react-router-hono-server/dist", {
        recursive: true,
        force: true,
      });
    },
  },
]);

function copyBuild(example: string) {
  fs.cpSync("dist", `examples/${example}/node_modules/react-router-hono-server/dist`, {
    recursive: true,
    force: true,
  });
  fs.copyFileSync("package.json", `examples/${example}/node_modules/react-router-hono-server/package.json`);
}

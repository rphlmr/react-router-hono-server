import fs from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/adapters/node.ts", "src/adapters/bun.ts", "src/dev.ts", "src/middleware.ts"],
    outDir: "dist",
    format: ["esm"],
    clean: true,
    dts: true,
    external: [
      // virtual module provided by React Router at build time
      "virtual:react-router/server-build",
    ],
    onSuccess: async () => {
      fs.cpSync("dist", "examples/react-router/node_modules/react-router-hono-server/dist", {
        recursive: true,
        force: true,
      });
      fs.cpSync("dist", "examples/react-router-bun/node_modules/react-router-hono-server/dist", {
        recursive: true,
        force: true,
      });
      fs.cpSync("dist", "examples/react-router-virtual/node_modules/react-router-hono-server/dist", {
        recursive: true,
        force: true,
      });
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

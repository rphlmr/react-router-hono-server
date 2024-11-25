import fs from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/node.ts", "src/dev.ts", "src/middleware.ts"],
  outDir: "dist",
  format: ["esm"],
  clean: true,
  dts: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  external: [
    // virtual module provided by React Router at build time
    "virtual:react-router/server-build",
  ],
  onSuccess: async () => {
    fs.cpSync("dist", "examples/react-router/node_modules/react-router-hono-server/dist", {
      recursive: true,
      force: true,
    });
    fs.cpSync("dist", "examples/react-router-virtual/node_modules/react-router-hono-server/dist", {
      recursive: true,
      force: true,
    });
  },
});

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
});

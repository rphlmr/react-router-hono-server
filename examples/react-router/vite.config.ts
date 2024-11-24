import { reactRouter } from "@react-router/dev/vite";
import { devServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    target: "esnext",
    rollupOptions: isSsrBuild
      ? {
          input: "app/server.ts",
        }
      : undefined,
  },
  plugins: [devServer(), reactRouter(), tsconfigPaths()],
}));

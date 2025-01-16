import MillionLint from "@million/lint";
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    MillionLint.vite({
      filter: {
        include: "**/app/**/*.tsx",
        exclude: ["**/node_modules/**/*", "**/app/**/*.stories.tsx", "**/app/**/*.spec.{ts,tsx}"],
      },
    }),
    reactRouter(),
    reactRouterHonoServer(),
    tsconfigPaths(),
  ],
  optimizeDeps: {
    include: ["@million/lint/runtime-dev"],
  },
});

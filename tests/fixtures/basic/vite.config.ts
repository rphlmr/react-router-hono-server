import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [reactRouterHonoServer(), reactRouter()],
});

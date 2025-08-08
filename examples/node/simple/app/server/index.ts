import { createHonoServer } from "react-router-hono-server/node";
import { getEnv } from "~/utils/env.server";
import { logger } from "./middleware";

console.log("loading server");

console.log("server env", getEnv().TZ);

export default await createHonoServer({
  async configure(app) {
    app.use("*", logger());
  },
  async getLoadContext(c, { mode, build }) {
    const isProductionMode = mode === "production";
    return {
      appVersion: isProductionMode ? build.assets.version : "dev",
    };
  },
});

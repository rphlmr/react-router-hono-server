import { createHonoServer } from "react-router-hono-server/node";
import { logger } from "./middleware";

console.log("loading server");

export default createHonoServer({
  configure(app) {
    app.use("*", logger());
  },
  getLoadContext(c, { mode, build }) {
    const isProductionMode = mode === "production";
    return {
      appVersion: isProductionMode ? build.assets.version : "dev",
    };
  },
});

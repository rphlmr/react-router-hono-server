import { createHonoServer } from "react-router-hono-server/node";
import { getBuildInfo } from "~/utils/circular";
import { logger } from "./middleware";

console.log("loading server");

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

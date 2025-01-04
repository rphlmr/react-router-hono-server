import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");

export default await createHonoServer({
  getLoadContext(c, { mode, build }) {
    const isProductionMode = mode === "production";
    return {
      appVersion: isProductionMode ? build.assets.version : "dev",
    };
  },
});

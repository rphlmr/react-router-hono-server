import { createHonoServer } from "react-router-hono-server/node";
import { someExternalHelper } from "./lib/captcha/helper";

console.log("loading server");

export default await createHonoServer({
  getLoadContext(c, { mode, build }) {
    console.log('from helper', someExternalHelper())
    const isProductionMode = mode === "production";
    return {
      appVersion: isProductionMode ? build.assets.version : "dev",
    };
  },
});

import { createHonoServer } from "react-router-hono-server/node";
import { getEnv } from "~/utils/env.server";
import { logger } from "./middleware";
import { createContext, RouterContextProvider } from "react-router";

console.log("loading server");

console.log("server env", getEnv().TZ);

type GlobalAppContext = {
  appVersion: string;
};

export const globalAppContext = createContext<GlobalAppContext>();


export default await createHonoServer({
  async configure(app) {
    app.use("*", logger());
  },
  async getLoadContext(c, { mode, build }) {
    const isProductionMode = mode === "production";
    const context = new RouterContextProvider();

    context.set(globalAppContext, {
      appVersion: isProductionMode ? build.assets.version : "dev",
    });

    return context;
  },
});

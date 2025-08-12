import { unstable_RouterContextProvider, unstable_createContext } from "react-router";
import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");

type GlobalAppContext = {
  appVersion: string;
};

export const globalAppContext = unstable_createContext<GlobalAppContext>();

export default await createHonoServer({
  getLoadContext(_c, { mode, build }) {
    const isProductionMode = mode === "production";
    const context = new unstable_RouterContextProvider();

    context.set(globalAppContext, { appVersion: isProductionMode ? build.assets.version : "dev" });

    return context;
  },
});

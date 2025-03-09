import { unstable_createContext } from "react-router";
import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");

type GlobalAppContext = {
  appVersion: string;
};

export const globalAppContext = unstable_createContext<GlobalAppContext>();

export default await createHonoServer({
  getLoadContext(c, { mode, build }) {
    const isProductionMode = mode === "production";
    return new Map([[globalAppContext, { appVersion: isProductionMode ? build.assets.version : "dev" }]]);
  },
});

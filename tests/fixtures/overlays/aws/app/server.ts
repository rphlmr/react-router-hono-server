import { RouterContextProvider } from "react-router";
import { createHonoServer } from "react-router-hono-server/aws-lambda";
import { testContext } from "./load-context";

type Env = {
  Variables: {
    testValue: string;
  };
};

const server = await createHonoServer<Env>({
  invokeMode: "default",
  async configure(app) {
    app.use("*", async (c, next) => {
      c.set("testValue", "from-hono");
      await next();
    });
    app.get("/api/health", (c) => c.json({ ok: true }));
  },
  getLoadContext(c) {
    const context = new RouterContextProvider();
    context.set(testContext, { testValue: c.get("testValue") });
    return context;
  },
});

export { server as development };
export default server;

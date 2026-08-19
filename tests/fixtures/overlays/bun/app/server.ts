import { RouterContextProvider } from "react-router";
import { createHonoServer } from "react-router-hono-server/bun";
import { testContext } from "./load-context";

type Env = {
  Variables: {
    testValue: string;
  };
};

export default await createHonoServer<Env>({
  async configure(app) {
    app.use("*", async (c, next) => {
      c.set("testValue", "from-hono");
      await next();
    });

    app.get("/api/health", (c) => c.json({ ok: true }));
  },
  getLoadContext(c) {
    const context = new RouterContextProvider();
    context.set(testContext, {
      testValue: c.get("testValue"),
    });
    return context;
  },
});

import { getConnInfo } from "@hono/node-server/conninfo";
import { createMiddleware } from "hono/factory";
import { reactRouterRedirect } from "react-router-hono-server/http";
import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");

const localNetwork = createMiddleware(async (c, next) => {
  const info = getConnInfo(c);
  console.log("localNetwork", info);
  console.log(`Remote address is ${info.remote.address}`);

  await next();
});

const protectRoutes = createMiddleware(async (c, next) => {
  console.log("Checking", c.req.path);

  if (c.req.path.includes("/protected")) {
    return reactRouterRedirect("/");
  }

  return next();
});

export default await createHonoServer({
  beforeAll(app) {
    app.use(protectRoutes);
  },
  configure(app) {
    app.use(localNetwork);
  },
});

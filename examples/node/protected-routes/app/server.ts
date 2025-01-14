import { getConnInfo } from "@hono/node-server/conninfo";
import { createMiddleware } from "hono/factory";
import { redirect } from "react-router-hono-server/http";
import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");

const printNetworkInfo = createMiddleware(async (c, next) => {
  const info = getConnInfo(c);
  console.log("ConnInfo", info);
  console.log(`Remote address is ${info.remote.address}`);

  await next();
});

const protectRoutes = createMiddleware(async (c, next) => {
  console.log("Checking path:", c.req.path);

  if (c.req.path.includes("/protected")) {
    return redirect(c, "/");
  }

  return next();
});

export default await createHonoServer({
  beforeAll(app) {
    app.use(protectRoutes);
  },
  configure(app) {
    app.use(printNetworkInfo);
  },
});

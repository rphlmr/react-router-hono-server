import { getConnInfo } from "@hono/node-server/conninfo";
import { createMiddleware } from "hono/factory";
import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");

const localNetwork = createMiddleware(async (c, next) => {
  const info = getConnInfo(c);
  console.log("localNetwork", info);
  console.log(`Remote address is ${info.remote.address}`);

  await next();
});

export default await createHonoServer({
  configure(app) {
    app.use(localNetwork);
  },
});

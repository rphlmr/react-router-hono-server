import { createHonoServer } from "react-router-hono-server/node";
import reactRouterConfig from "../../react-router.config";
import { exampleMiddleware } from "./middleware";

console.log("loading server");

export default await createHonoServer({
  buildDirectory: reactRouterConfig.buildDirectory,
  configure(server) {
    server.use("*", exampleMiddleware());
  },
});

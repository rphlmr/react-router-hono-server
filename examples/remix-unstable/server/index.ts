import { createHonoServer } from "react-router-hono-server/node";
import { exampleMiddleware } from "./middleware";

export const server = await createHonoServer({
  configure(server) {
    server.use("*", exampleMiddleware());
  },
});

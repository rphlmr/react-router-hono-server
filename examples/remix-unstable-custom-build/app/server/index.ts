import { createHonoServer } from "react-router-hono-server/node";
import { exampleMiddleware } from "./middleware";

export const server = await createHonoServer({
  buildDirectory: "dist",
  configure(server) {
    server.use("*", exampleMiddleware());
  },
  listeningListener(info) {
    console.log(`Server is listening on http://localhost:${info.port}`);
  },
});

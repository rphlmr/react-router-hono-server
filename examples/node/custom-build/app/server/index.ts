import { createHonoServer } from "react-router-hono-server/node";
import { exampleMiddleware } from "./middleware";

console.log("loading server");

export default await createHonoServer({
  configure(server) {
    server.use("*", exampleMiddleware());
  },
  listeningListener(info) {
    console.log(`Server is listening on http://localhost:${info.port}`);
  },
});

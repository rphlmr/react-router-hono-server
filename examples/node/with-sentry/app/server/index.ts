// import the Sentry instrumentation file before anything else.
// It is important to import it as .js for this to work, even if the file is .ts
import "./instrument.server.js";

import { createHonoServer } from "react-router-hono-server/node";
import { exampleMiddleware } from "./middleware.js";

console.log("loading server");

export default await createHonoServer({
  configure(server) {
    server.use("*", exampleMiddleware());
  },
});

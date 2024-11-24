import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");
export default await createHonoServer({
  build: import(
    // @ts-expect-error - virtual module provided by React Router at build time
    "virtual:react-router/server-build"
  ),
});

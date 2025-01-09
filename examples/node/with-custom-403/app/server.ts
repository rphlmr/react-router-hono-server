import { createMiddleware } from "hono/factory";
import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");

export default await createHonoServer({
  beforeAll(app) {
    app.use(
      createMiddleware(async (c, next) => {
        await next();

        if (c.res.status === 403) {
          return c.redirect("/403");
        }
      })
    );
  },
  configure(app) {
    app.use(
      createMiddleware(async (c, next) => {
        if (c.req.path.startsWith("/admin")) {
          return c.redirect("/403");
        }

        await next();
      })
    );
  },
});

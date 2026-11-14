import { createMiddleware } from "hono/factory";
import { getPath, redirect } from "react-router-hono-server/http";

export const httpHelpers = createMiddleware(async (c, next) => {
  if (c.req.query("__http_helper") === "path") {
    return c.json({ path: getPath(c), requestUrl: c.req.url });
  }

  if (c.req.query("__http_helper") === "redirect") {
    return redirect(c, "/login");
  }

  await next();
});

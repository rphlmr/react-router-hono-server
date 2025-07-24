import { createMiddleware } from "hono/factory";
import { getEnv } from "~/utils/env.server";

export function logger() {
  return createMiddleware(async (c, next) => {
    const request = c.req.raw;
    const method = request.method;
    console.log(getEnv());

    await next();

    console.log(
      `[${new Date().toISOString()}] ${method} ${request.url} - ${c.res.status} ${c.res.headers.get("Content-Length") || 0} bytes`
    );
  });
}

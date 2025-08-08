import { createMiddleware } from "hono/factory";

const module = await import("~/utils/circular");
await module.getBuildInfo().then((data) => {
  console.log("build info", data);
});

export function logger() {
  return createMiddleware(async (c, next) => {
    const request = c.req.raw;
    const method = request.method;

    await next();

    console.log(
      `[${new Date().toISOString()}] ${method} ${request.url} - ${c.res.status} ${c.res.headers.get("Content-Length") || 0} bytes`
    );
  });
}

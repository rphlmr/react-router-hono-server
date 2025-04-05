import type { ViteDevServer } from "vite";

/* @internal */
declare global {
  var __viteDevServer: ViteDevServer | undefined;
}

declare module "@hono/node-server/serve-static" {
  const serveStatic: <E extends Env = Env>(options?: ServeStaticOptions<E>) => MiddlewareHandler;
}

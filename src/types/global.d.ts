import type { ViteDevServer } from "vite";

/* @internal */
declare global {
  var __viteDevServer: ViteDevServer | undefined;
}

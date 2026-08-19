# Migrating from 3.x to 4.0

Version 4 makes the currently supported runtime and dependency contract explicit. Perform a clean installation and verify the application on its real deployment runtime; a repository workspace link is no longer a representative test setup.

## Supported engines and dependencies

Upgrade the application to:

- Node.js 24.19 or newer for installation, builds, the CLI, and Node/AWS execution
- React and React DOM 19.2
- React Router 8.3 or newer
- Vite 8
- Hono 4
- Bun 1.3 when using Bun, or Deno 2 when using Deno
- the current supported-major Cloudflare Vite plugin and Wrangler 4 for Workers

`@hono/node-server` 2 is now installed as an implementation dependency of this package. Remove it from the application's dependencies unless application code imports it directly.

React 18, React Router 7, the legacy Cloudflare proxy integration, and compatibility code selected by `force_react_19` are removed. Remove `force_react_19` from every server and plugin configuration.

## React Router server rendering

React Router 8.3 selects its default server entry from the application's dependencies. Keep `@react-router/node` for Node and AWS applications. Remove `@react-router/node`, `@react-router/express`, and `@react-router/serve` from Bun, Deno, and Cloudflare applications so React Router selects its Web Streams entry.

Delete a custom `app/entry.server.tsx` when it only exists to select `renderToReadableStream`; React Router now handles that selection. Keep custom entries that implement application-specific rendering behavior.

React Router's optional `future.unstable_enableNodeReadableStream` and `future.unstable_optimizeDeps` flags work without corresponding `reactRouterHonoServer()` options. They are experimental and are not enabled by default. A custom server entry takes precedence over `unstable_enableNodeReadableStream`; if `unstable_optimizeDeps` causes development issues, remove it and restart the dev server.

## React Router context

React Router middleware is unconditional in React Router 8. Remove obsolete middleware future flags and return a `RouterContextProvider` from `getLoadContext`.

Before:

```ts
declare module "react-router" {
  interface Future {
    v8_middleware: true;
  }
}

export default createHonoServer({
  getLoadContext() {
    return { user: "Ada" };
  },
});
```

After:

```ts
import { createContext, RouterContextProvider } from "react-router";
import { createHonoServer } from "react-router-hono-server/node";

export const userContext = createContext<string>();

export default await createHonoServer({
  getLoadContext() {
    const context = new RouterContextProvider();
    context.set(userContext, "Ada");
    return context;
  },
});
```

## Node WebSockets

Remove `@hono/node-ws`. Node development and production WebSockets now use the implementation integrated with `@hono/node-server` 2:

```ts
import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer({
  useWebSocket: true,
  configure(app, { upgradeWebSocket }) {
    app.get(
      "/ws",
      upgradeWebSocket(() => ({
        onMessage(event, ws) {
          ws.send(String(event.data));
        },
      })),
    );
  },
});
```

Do not add a Vite preload or a second upgrade handler. The adapter attaches the Hono WebSocket implementation alongside Vite HMR.

## Cloudflare Workers

Replace legacy proxy or Miniflare Vite configuration with the official Cloudflare Vite plugin. Plugin order is significant.

Before:

```ts
export default defineConfig({
  plugins: [reactRouter(), reactRouterHonoServer({ runtime: "cloudflare" })],
});
```

After:

```ts
import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    reactRouterHonoServer({ runtime: "cloudflare" }),
    reactRouter(),
  ],
});
```

Use an assets binding and Node compatibility in `wrangler.jsonc`:

```jsonc
{
  "compatibility_date": "2026-08-11",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./app/server.ts",
  "assets": {
    "directory": "./build/client",
    "binding": "ASSETS",
  },
}
```

## Canonical scripts

Node:

```json
{
  "build": "react-router build",
  "dev": "react-router dev",
  "start": "node ./build/server/index.js",
  "typecheck": "react-router typegen && tsc --noEmit"
}
```

Bun:

```json
{
  "build": "bunx --bun react-router build",
  "dev": "bunx --bun vite",
  "start": "bun ./build/server/index.js",
  "typecheck": "react-router typegen && tsc --noEmit"
}
```

Deno:

```json
{
  "build": "react-router build",
  "dev": "deno run --conditions=development --allow-all npm:@react-router/dev dev",
  "start": "deno run --allow-all ./build/server/index.js",
  "typecheck": "react-router typegen && tsc --noEmit"
}
```

Cloudflare:

```json
{
  "build": "react-router build",
  "dev": "vite dev",
  "start": "vite preview",
  "typecheck": "react-router typegen && tsc --noEmit"
}
```

AWS Lambda:

```json
{
  "build": "react-router build",
  "dev": "react-router dev",
  "typecheck": "react-router typegen && tsc --noEmit"
}
```

## Configuration changes

- Keep `reactRouterHonoServer()` before `reactRouter()`.
- Select exactly one runtime in both the plugin option and adapter import.
- Await `createHonoServer()` in the server entry.
- Use the Cloudflare Vite plugin instead of a proxy.
- Remove `force_react_19` and middleware future flags.
- Keep React Router future flags in `react-router.config.ts`; do not copy them into the Hono plugin options.
- For AWS streaming, use `invokeMode: "stream"`; otherwise use `invokeMode: "default"`.
- Third-party Sentry, database, queue, Socket.IO, and other integration demonstrations are no longer maintained as part of this package's support contract.

## Verification checklist

1. Delete every application `node_modules`, generated build directory, React Router type-generation directory, and stale runtime lockfile.
2. Install with the runtime's package manager: pnpm for Node, Cloudflare, and AWS; Bun for Bun; `deno install --allow-scripts` for Deno.
3. Confirm `react-router-hono-server` resolves from the installed package, not a workspace link.
4. Run the canonical `typecheck` script.
5. Run the canonical `build` script.
6. Start the production command or invoke the built Lambda handler.
7. Verify SSR, loader/action `.data` requests, redirects, explicit errors, streaming, Hono routes, headers/cookies, public files, built assets, and cache headers.
8. In a browser, verify hydration, navigation, form actions, assets, and development HMR without a full-page reload.
9. For Cloudflare, verify both Workerd development and the Vite production preview with real bindings.
10. For Node or Bun WebSockets, verify both development and production connections and graceful process shutdown.

Any additional incompatibility discovered during these checks is a breaking application dependency or runtime assumption and should be removed instead of hidden behind an alias, preload, or test-only flag.

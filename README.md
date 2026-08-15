# React Router Hono Server

`react-router-hono-server` is a Vite plugin and a set of Hono adapters for running a React Router framework-mode application on Node.js, Bun, Deno, Cloudflare Workers, or AWS Lambda. It owns the server entry, static-file handling, Hono middleware integration, and runtime startup while React Router continues to own routes and rendering.

## Contents

- [Runtime matrix](#runtime-matrix)
- [Requirements and compatibility](#requirements-and-compatibility)
- [Minimal Node quick start](#minimal-node-quick-start)
- [Runtime selection](#runtime-selection)
- [Reveal and entry files](#reveal-and-entry-files)
- Runtime guides: [Node.js](#nodejs), [Bun](#bun), [Deno](#deno), [Cloudflare Workers](#cloudflare-workers), [AWS Lambda](#aws-lambda)
- [Server customization](#server-customization)
- [API and exports](#api-and-exports)
- [Troubleshooting](#troubleshooting)

## Runtime matrix

| Runtime | Development | Production | WebSockets | Static assets |
| --- | --- | --- | --- | --- |
| Node.js | React Router dev server | Node HTTP/HTTPS | Yes | Node filesystem |
| Bun | Bun-powered React Router dev server | `Bun.serve` | Yes | Bun filesystem |
| Deno | Deno-powered Vite dev server | `Deno.serve` | No | Deno filesystem |
| Cloudflare Workers | Cloudflare Vite plugin and Workerd | Worker + asset binding | Platform APIs | Workers assets |
| AWS Lambda | React Router dev server | Lambda handler or response streaming | No | Use CloudFront/S3 in production |

## Requirements and compatibility

- Node.js 24.17 or newer is required for installation, builds, and the CLI.
- React 19.2, React DOM 19.2, React Router 8, Vite 8, Hono 4, and `@hono/node-server` 2 are supported.
- Bun 1.3 or newer is required for Bun execution.
- Deno 2 is required for Deno execution.
- Cloudflare projects require the current `@cloudflare/vite-plugin`, Wrangler 4, an `ASSETS` binding, and the `nodejs_compat` compatibility flag.

Keep the application and this package on one installation of React, React DOM, React Router, Hono, and Vite. Do not alias or duplicate those packages.

## Minimal Node quick start

Start from a React Router framework-mode project, then install the server and its peers:

```sh
pnpm add react-router-hono-server hono @hono/node-server
pnpm add -D @react-router/dev vite
```

Create `vite.config.ts`:

<!-- canonical:node-vite -->

```ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouterHonoServer(), reactRouter()],
});
```

Create `app/server.ts`:

<!-- canonical:node-server -->

```ts
import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer();
```

Use these scripts in `package.json`:

<!-- canonical:node-scripts -->

```json
{
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "node ./build/server/index.js",
    "typecheck": "react-router typegen && tsc --noEmit"
  }
}
```

Run `pnpm dev` during development. For production, run `pnpm build` followed by `pnpm start`.

## Runtime selection

Set `runtime` in the Hono server Vite plugin and import the matching adapter in the server entry.

| Runtime | Plugin option | Server import |
| --- | --- | --- |
| Node.js | omitted or `node` | `react-router-hono-server/node` |
| Bun | `bun` | `react-router-hono-server/bun` |
| Deno | `deno` | `react-router-hono-server/deno` |
| Cloudflare | `cloudflare` | `react-router-hono-server/cloudflare` |
| AWS Lambda | `aws` | `react-router-hono-server/aws-lambda` |

The plugin must precede `reactRouter()`. On Cloudflare, `cloudflare()` must precede both.

## Reveal and entry files

React Router and this package each provide a default entry that keeps a new project small. Reveal an entry only when the application needs to own and customize it. The two reveal commands operate on different layers.

### Hono server entry

Without `app/server.ts` or `app/server/index.ts`, `reactRouterHonoServer()` supplies a virtual server that calls the selected runtime's `createHonoServer()` with default options. Reveal this package's server entry when you need Hono routes or middleware, a load context, WebSockets, static-file options, or runtime-specific server options:

```sh
npx react-router-hono-server reveal file
```

This creates `app/server.ts`. Use the folder form if the server will have colocated modules:

```sh
npx react-router-hono-server reveal folder
```

This creates `app/server/index.ts`. The CLI infers the runtime from the `runtime` option in `vite.config.ts` and defaults to Node.js when it cannot find one. Run it from the project root. It overwrites the target file, so do not run it over an existing customized server entry.

### React Router rendering entries

React Router normally supplies hidden `app/entry.client.tsx` and `app/entry.server.tsx` defaults. Reveal them when you need to control hydration or SSR streaming:

```sh
npx react-router reveal
```

React Router then generates both files and uses them instead of its defaults. Node.js, Bun, and AWS can use the standard Node streaming server entry. Deno and Cloudflare must use a server entry based on `renderToReadableStream`, so reveal the files before adapting `app/entry.server.tsx` for those runtimes. See the [React Router CLI documentation](https://reactrouter.com/api/other-api/dev#react-router-reveal).

`app/server.ts` and `app/entry.server.tsx` are not alternatives: the first configures the Hono runtime server, while the second renders a React Router request into an HTTP response.

## Node.js

Install:

```sh
pnpm add react-router-hono-server hono @hono/node-server
pnpm add -D @react-router/dev vite
```

Use the quick-start `vite.config.ts` and `app/server.ts` above. React Router's default Node rendering entry is compatible; reveal it only when the application needs custom SSR behavior.

Package scripts:

```json
{
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "node ./build/server/index.js",
    "typecheck": "react-router typegen && tsc --noEmit"
  }
}
```

`pnpm dev` starts development. `pnpm build && pnpm start` builds and starts production. Set `PORT` or pass `port` and `hostname` to `createHonoServer`. Node additionally supports `listeningListener`, `onServe`, `customNodeServer`, `overrideGlobalObjects`, static options, and WebSockets.

## Bun

Install with Bun:

```sh
bun add react-router-hono-server hono @hono/node-server
bun add -d @react-router/dev vite @types/bun
```

Create `vite.config.ts`:

<!-- canonical:bun-vite -->

```ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouterHonoServer({ runtime: "bun" }), reactRouter()],
});
```

Create `app/server.ts`:

<!-- canonical:bun-server -->

```ts
import { createHonoServer } from "react-router-hono-server/bun";

export default await createHonoServer();
```

React Router's default Node streaming entry is compatible; reveal it only when the application needs custom SSR behavior. Package scripts:

<!-- canonical:bun-scripts -->

```json
{
  "scripts": {
    "build": "react-router build",
    "dev": "bunx --bun vite",
    "start": "bun ./build/server/index.js",
    "typecheck": "react-router typegen && tsc --noEmit"
  }
}
```

Run `bun run dev` or `bun run build && bun run start`. Bun supports `customBunServer`, `onGracefulShutdown`, static options, and WebSockets.

## Deno

Declare npm dependencies in `package.json`, then install them into an isolated Deno project:

```sh
deno install --allow-scripts --minimum-dependency-age=0
```

Create `vite.config.ts`:

<!-- canonical:deno-vite -->

```ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouterHonoServer({ runtime: "deno" }), reactRouter()],
});
```

Create `app/server.ts`:

<!-- canonical:deno-server -->

```ts
import { createHonoServer } from "react-router-hono-server/deno";

export default await createHonoServer();
```

Run `react-router reveal`, then make `app/entry.server.tsx` use `renderToReadableStream` from `react-dom/server`. Package scripts:

<!-- canonical:deno-scripts -->

```json
{
  "scripts": {
    "build": "react-router build",
    "dev": "deno run --conditions=development --allow-all npm:@react-router/dev dev",
    "start": "deno run --allow-all ./build/server/index.js",
    "typecheck": "react-router typegen && tsc --noEmit"
  }
}
```

Run `deno task dev` or `deno task build && deno task start`. Deno supports `customDenoServer`, `onGracefulShutdown`, and static options. WebSockets are not part of this adapter's support contract.

## Cloudflare Workers

Install:

```sh
pnpm add react-router-hono-server hono
pnpm add -D @cloudflare/vite-plugin @cloudflare/workers-types @react-router/dev vite wrangler
```

Create `vite.config.ts`; plugin order is required:

<!-- canonical:cloudflare-vite -->

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

Create `app/server.ts`:

<!-- canonical:cloudflare-server -->

```ts
import { createHonoServer } from "react-router-hono-server/cloudflare";

export default await createHonoServer();
```

Run `react-router reveal`, then use a `renderToReadableStream` React server entry. Create `wrangler.jsonc`:

<!-- canonical:cloudflare-wrangler -->

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-react-router-worker",
  "compatibility_date": "2026-08-11",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./app/server.ts",
  "assets": {
    "directory": "./build/client",
    "binding": "ASSETS"
  }
}
```

Package scripts:

<!-- canonical:cloudflare-scripts -->

```json
{
  "scripts": {
    "build": "react-router build",
    "dev": "vite dev",
    "start": "vite preview",
    "typecheck": "react-router typegen && tsc --noEmit"
  }
}
```

Run `pnpm dev` for Workerd-backed development and `pnpm build && pnpm start` for a local production preview. Deploy the generated Worker with your Cloudflare workflow. The `ASSETS` binding serves public and built files; a missing or unsuccessful asset response falls through to Hono and React Router.

Cloudflare's current React Router integration does not support SPA mode or prerendering. Use SSR routes for this adapter.

## AWS Lambda

Install:

```sh
pnpm add react-router-hono-server hono @hono/node-server
pnpm add -D @react-router/dev vite
```

Create `vite.config.ts`:

<!-- canonical:aws-vite -->

```ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouterHonoServer({ runtime: "aws" }), reactRouter()],
});
```

Create `app/server.ts` for the default Lambda response mode:

<!-- canonical:aws-server -->

```ts
import { createHonoServer } from "react-router-hono-server/aws-lambda";

export default await createHonoServer({ invokeMode: "default" });
```

For Lambda response streaming, set `invokeMode: "stream"`. React Router's default Node rendering entry is compatible; reveal it only for custom SSR behavior. Package scripts:

<!-- canonical:aws-scripts -->

```json
{
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "typecheck": "react-router typegen && tsc --noEmit"
  }
}
```

Run `pnpm dev` locally and `pnpm build` before packaging `build/server` for Lambda. Export the generated default handler from the Lambda entry configured by your infrastructure. Production static files should be served by S3/CloudFront or another asset service.

## Server customization

### Hono app and middleware ordering

Pass `app` to supply an existing Hono app. `beforeAll(app)` runs before built-in asset and logger middleware. `configure(app)` runs after built-ins and before the React Router handler.

```ts
import { Hono } from "hono";
import { createHonoServer } from "react-router-hono-server/node";

const app = new Hono();

export default await createHonoServer({
  app,
  defaultLogger: false,
  beforeAll(server) {
    server.use("/private/*", async (c, next) => {
      if (!c.req.header("authorization")) return c.text("Unauthorized", 401);
      await next();
    });
  },
  configure(server) {
    server.get("/api/health", (c) => c.json({ ok: true }));
  },
});
```

### Typed React Router context

React Router 8 always expects `getLoadContext` to return a `RouterContextProvider`.

```ts
import { createContext, RouterContextProvider } from "react-router";
import { createHonoServer } from "react-router-hono-server/node";

export const requestIdContext = createContext<string>();

export default await createHonoServer({
  getLoadContext(c) {
    const context = new RouterContextProvider();
    context.set(requestIdContext, c.req.header("x-request-id") ?? crypto.randomUUID());
    return context;
  },
});
```

`createGetLoadContext` is exported by each adapter when a separately declared callback needs contextual typing.

### WebSockets

Node and Bun support Hono WebSockets in development and production:

```ts
import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer({
  useWebSocket: true,
  configure(app, { upgradeWebSocket }) {
    app.get("/ws", upgradeWebSocket(() => ({
      onMessage(event, ws) {
        ws.send(`echo:${event.data}`);
      },
    })));
  },
});
```

Node WebSockets use `@hono/node-server` 2 and coexist with Vite HMR.

### Basename and prerendering

Configure `basename`, `prerender`, `appDirectory`, and `buildDirectory` in `react-router.config.ts` where the selected runtime supports them. The plugin reads the resolved React Router configuration and mounts the Hono-backed handler at the same basename. Keep the plugin before `reactRouter()` and keep the generated server build layout unchanged unless the deployment consumes the configured layout.

## API and exports

| Export | Purpose |
| --- | --- |
| `react-router-hono-server/dev` | `reactRouterHonoServer(options)` Vite plugin |
| `/node` | Node `createHonoServer`, options, and `createGetLoadContext` |
| `/bun` | Bun `createHonoServer`, options, and `createGetLoadContext` |
| `/deno` | Deno `createHonoServer`, options, and `createGetLoadContext` |
| `/cloudflare` | Cloudflare `createHonoServer`, options, and `createGetLoadContext` |
| `/aws-lambda` | AWS handler factory, options, and `createGetLoadContext` |
| `/middleware` | `cache(seconds)` static-response middleware |
| `/http` | `redirect(c, location)`, deprecated `reactRouterRedirect(location)`, and `getPath(c)` |
| CLI | [`react-router-hono-server reveal file` or `reveal folder`](#hono-server-entry) |

The Vite plugin accepts `runtime`, `serverEntryPoint`, `dev.exclude`, and `dev.export`. Without a discovered `app/server.ts` or `app/server/index.ts`, it supplies a virtual default server for the selected runtime.

## Troubleshooting

- **Cloudflare plugin missing:** add `cloudflare()` first in the Vite plugin list.
- **Two React installations:** remove aliases and workspace links, clean all lockfiles and `node_modules`, then reinstall once with the runtime's package manager.
- **Server entry not found:** create `app/server.ts`, create `app/server/index.ts`, or pass `serverEntryPoint`.
- **Incorrect load context:** return a `RouterContextProvider`, not a plain object.
- **Assets return the app HTML:** verify the build directory and, on Cloudflare, the `ASSETS` binding.
- **Upgrade from the previous major:** follow [MIGRATION.md](./MIGRATION.md) and perform its clean-install checklist.

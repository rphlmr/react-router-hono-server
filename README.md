# React Router Hono Server

Run a React Router framework-mode application on Hono—without giving up the runtime you want.

`react-router-hono-server` provides a Vite plugin and production adapters for Node.js, Bun, Deno, Cloudflare Workers, and AWS Lambda.

It gives your application one clear server boundary:

- React Router owns routes, loaders, actions, and rendering.
- Hono owns middleware, API routes, request context, and runtime integration.
- This package connects them and handles startup, static assets, and build output.

## Why use it?

- **One server API across five runtimes.** Move between runtimes without redesigning the application.
- **First-class Hono customization.** Add middleware, API endpoints, typed context, and runtime options around React Router.
- **Production and development parity.** Use the same server entry in Vite development and in the production runtime.
- **React Router features stay intact.** SSR, prerendering, SPA output, basenames, and custom build layouts remain React Router configuration.
- **Small default surface.** Start with a virtual server entry and reveal files only when customization is needed.

## Contents

- [Runtime matrix](#runtime-matrix)
- [Requirements and compatibility](#requirements-and-compatibility)
- [Minimal Node quick start](#minimal-node-quick-start)
- [Runtime selection](#runtime-selection)
- [Reveal and entry files](#reveal-and-entry-files)
- [Runtime guides](#runtime-guides)
  - [Node.js](#nodejs)
  - [Bun](#bun)
  - [Deno](#deno)
  - [Cloudflare Workers](#cloudflare-workers)
  - [AWS Lambda](#aws-lambda)
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

Choose the runtime that matches your deployment target. Application routes and Hono configuration remain portable; runtime-specific server options stay isolated in `app/server.ts`.

## Requirements and compatibility

### Supported versions

- Node.js 24.17 or newer is required for installation, builds, and the CLI.
- React 19.2, React DOM 19.2, React Router 8, Vite 8, Hono 4, and `@hono/node-server` 2 are supported.
- Bun 1.3 or newer is required for Bun execution.
- Deno 2 is required for Deno execution.
- Cloudflare projects require the current `@cloudflare/vite-plugin`, Wrangler 4, an `ASSETS` binding, and the `nodejs_compat` compatibility flag.

> [!IMPORTANT]
> Keep the application and this package on one installation of React, React DOM, React Router, Hono, and Vite.
>
> Aliased or duplicated framework packages can cause invalid hooks, incompatible contexts, and build failures.

## Minimal Node quick start

The following setup creates a Node.js server. The other runtime guides use the same structure with a different adapter.

### 1. Install the packages

```sh
pnpm add react-router-hono-server hono @hono/node-server
pnpm add -D @react-router/dev vite
```

### 2. Add the Vite plugin

Create `vite.config.ts`. The Hono server plugin must come before `reactRouter()`.

<!-- canonical:node-vite -->

```ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouterHonoServer(), reactRouter()],
});
```

### 3. Create the server entry

Create `app/server.ts`:

<!-- canonical:node-server -->

```ts
import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer();
```

### 4. Add package scripts

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

### 5. Run the application

```sh
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Runtime selection

The runtime is selected in two places:

1. Set `runtime` in `reactRouterHonoServer()`.
2. Import the matching adapter from the server entry.

| Runtime | Plugin option | Server import |
| --- | --- | --- |
| Node.js | omitted or `node` | `react-router-hono-server/node` |
| Bun | `bun` | `react-router-hono-server/bun` |
| Deno | `deno` | `react-router-hono-server/deno` |
| Cloudflare | `cloudflare` | `react-router-hono-server/cloudflare` |
| AWS Lambda | `aws` | `react-router-hono-server/aws-lambda` |

> [!IMPORTANT]
> The plugin must precede `reactRouter()`. On Cloudflare, `cloudflare()` must precede both plugins.

## Reveal and entry files

React Router and this package each provide a default entry file. These entries operate at different layers and solve different problems.

| Entry | Owned by | Responsibility |
| --- | --- | --- |
| `app/server.ts` | `react-router-hono-server` | Hono middleware, API routes, load context, assets, and runtime startup |
| `app/entry.server.tsx` | React Router | Rendering a matched React Router request into a response |
| `app/entry.client.tsx` | React Router | Browser hydration |

Reveal only the entry you need to customize.

### Hono server entry

Without `app/server.ts` or `app/server/index.ts`, the plugin supplies a virtual Hono server with default options.

Reveal the Hono entry when you need any of the following:

- Hono middleware or API routes
- A React Router load context
- WebSockets
- Static-file configuration
- Runtime-specific server options

Create `app/server.ts`:

```sh
npx react-router-hono-server reveal file
```

Use the folder form when the server has colocated modules:

```sh
npx react-router-hono-server reveal folder
```

The CLI infers the runtime from `vite.config.ts`. If it cannot find a runtime option, it generates a Node.js entry.

> [!WARNING]
> Run the command from the project root. The reveal command overwrites its target, so do not run it over an entry you have already customized.

### React Router rendering entries

React Router normally supplies hidden client and server rendering entries. Reveal them when you need to control hydration or SSR streaming:

```sh
npx react-router reveal
```

The command generates both `app/entry.client.tsx` and `app/entry.server.tsx`.

- Node.js and AWS can use the standard Node streaming entry.
- Bun, Deno, and Cloudflare require a Web Streams entry based on `renderToReadableStream`.

See the [React Router reveal documentation](https://reactrouter.com/api/other-api/dev#react-router-reveal) for the generated files.

## Runtime guides

### Node.js

Node.js is the default runtime and the shortest path to production. Follow the [minimal Node quick start](#minimal-node-quick-start); no runtime option is required.

#### Node.js runtime notes

- React Router's default Node rendering entry is compatible.
- Set the listening port with `PORT` or the `port` server option.
- Use `hostname` to control the listening interface.
- Advanced options include `listeningListener`, `onServe`, `customNodeServer`, and `overrideGlobalObjects`.
- Static-file customization and WebSockets are supported.

### Bun

#### Install

```sh
bun add react-router-hono-server hono @hono/node-server
bun add -d @react-router/dev vite @types/bun
```

#### Configure Vite

Create `vite.config.ts` and select the Bun runtime:

<!-- canonical:bun-vite -->

```ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouterHonoServer({ runtime: "bun" }), reactRouter()],
});
```

#### Create the server entry

Create `app/server.ts`:

<!-- canonical:bun-server -->

```ts
import { createHonoServer } from "react-router-hono-server/bun";

export default await createHonoServer();
```

#### Configure React rendering

Reveal the React Router entries:

```sh
bunx --bun react-router reveal
```

Update `app/entry.server.tsx` to use `renderToReadableStream` from `react-dom/server`. React 19 selects its
Bun-specific server renderer for this import. Before returning the response, pipe the React stream through a
`TransformStream` so suspended content continues streaming after the initial shell.

#### Add scripts

<!-- canonical:bun-scripts -->

```json
{
  "scripts": {
    "build": "bunx --bun react-router build",
    "dev": "bunx --bun vite",
    "start": "bun ./build/server/index.js",
    "typecheck": "react-router typegen && tsc --noEmit"
  }
}
```

#### Run

```sh
# Development
bun run dev

# Production
bun run build
bun run start
```

#### Bun runtime notes

- `bunx --bun vite` forces Vite and its child processes to run with Bun.
- React SSR uses React 19's Bun-specific renderer and standard Web Streams.
- `customBunServer` forwards options to `Bun.serve`.
- Graceful shutdown, static-file customization, and WebSockets are supported.

### Deno

#### Install

Declare npm dependencies in `package.json`, then install them into the project:

```sh
deno install --allow-scripts --minimum-dependency-age=0
```

#### Configure Vite

Create `vite.config.ts` and select the Deno runtime:

<!-- canonical:deno-vite -->

```ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouterHonoServer({ runtime: "deno" }), reactRouter()],
});
```

#### Create the server entry

Create `app/server.ts`:

<!-- canonical:deno-server -->

```ts
import { createHonoServer } from "react-router-hono-server/deno";

export default await createHonoServer();
```

#### Configure React rendering

Reveal the React Router entries:

```sh
deno run --allow-all npm:@react-router/dev reveal
```

Update `app/entry.server.tsx` to use `renderToReadableStream` from `react-dom/server`.

#### Add scripts

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

#### Run

```sh
# Development
deno task dev

# Production
deno task build
deno task start
```

#### Deno runtime notes

- The development command enables the `development` export condition required by React Router.
- `customDenoServer` forwards options to `Deno.serve`.
- Graceful shutdown and static-file customization are supported.
- WebSockets are not part of this adapter's support contract.

### Cloudflare Workers

#### Install

```sh
pnpm add react-router-hono-server hono
pnpm add -D @cloudflare/vite-plugin @cloudflare/workers-types @react-router/dev vite wrangler
```

#### Configure Vite

Create `vite.config.ts`. Plugin order is required:

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

#### Create the server entry

Create `app/server.ts`:

<!-- canonical:cloudflare-server -->

```ts
import { createHonoServer } from "react-router-hono-server/cloudflare";

export default await createHonoServer();
```

#### Configure React rendering

Run `react-router reveal`, then update `app/entry.server.tsx` to use `renderToReadableStream`.

#### Configure Wrangler

Create `wrangler.jsonc`:

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

The `ASSETS` binding connects the generated client directory to the Worker.

#### Add scripts

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

#### Run

```sh
# Workerd-backed development
pnpm dev

# Local production preview
pnpm build
pnpm start
```

Deploy the generated Worker with your normal Cloudflare workflow.

#### Cloudflare runtime notes

- Public files and generated client files are served through `ASSETS`.
- Missing or unsuccessful asset responses fall through to Hono and React Router.
- Prerendering and SPA mode are supported.
- With `ssr: true`, a route without a generated asset falls through to runtime SSR.

### AWS Lambda

#### Install

```sh
pnpm add react-router-hono-server hono @hono/node-server
pnpm add -D @react-router/dev vite
```

#### Configure Vite

Create `vite.config.ts` and select the AWS runtime:

<!-- canonical:aws-vite -->

```ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouterHonoServer({ runtime: "aws" }), reactRouter()],
});
```

#### Create the Lambda entry

Create `app/server.ts` for the default response mode:

<!-- canonical:aws-server -->

```ts
import { createHonoServer } from "react-router-hono-server/aws-lambda";

export default await createHonoServer({ invokeMode: "default" });
```

Set `invokeMode: "stream"` to use Lambda response streaming.

React Router's default Node rendering entry is compatible. Reveal it only when the application needs custom SSR behavior.

#### Add scripts

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

#### Build and deploy

Use `pnpm dev` locally, then run `pnpm build` before packaging `build/server` for Lambda.

Your infrastructure must expose the generated default handler as the Lambda entry.

#### AWS runtime notes

- Production static files should be served by S3, CloudFront, or another asset service.
- Prerendered files are generated in `build/client`; deploy them with the static assets.
- Requests that reach Lambda continue through runtime SSR.
- Both default responses and Lambda response streaming are supported.

## Server customization

Create or reveal a Hono server entry before using these options:

```sh
npx react-router-hono-server reveal file
```

### Hono app and middleware ordering

Pass `app` to use an existing Hono instance. Hooks execute in this order:

| Order | Hook or middleware | Typical use |
| --- | --- | --- |
| 1 | `beforeAll(app)` | Authentication or request policy that must run before assets |
| 2 | Built-in asset handling | Public files and generated client assets |
| 3 | Built-in logger | Request logging when `defaultLogger` is enabled |
| 4 | `configure(app)` | API routes and application middleware |
| 5 | React Router handler | Loaders, actions, and rendered routes |

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

Each adapter also exports `createGetLoadContext` for separately declared callbacks that need contextual typing.

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

Prerendering is configured by React Router in `react-router.config.ts`.

#### Prerender every static route

```ts
import type { Config } from "@react-router/dev/config";

export default {
  prerender: true,
} satisfies Config;
```

Dynamic routes are not included because their parameter values are unknown.

#### Prerender selected routes

```ts
import type { Config } from "@react-router/dev/config";

export default {
  prerender: ["/", "/about", "/posts/launch"],
} satisfies Config;
```

Use concrete paths such as `/posts/launch` for dynamic routes. Paths are relative to the React Router basename; do not include the basename itself.

#### Discover routes asynchronously

```ts
import type { Config } from "@react-router/dev/config";

export default {
  prerender: {
    async paths() {
      return ["/", "/about"];
    },
    concurrency: 4,
  },
} satisfies Config;
```

React Router also accepts `basename`, `appDirectory`, and `buildDirectory` in the same configuration file.

#### Deployment behavior

| Configuration | Node, Bun, Deno, and Cloudflare Workers | AWS Lambda |
| --- | --- | --- |
| `ssr: true` with `prerender` | Generates and serves static documents and route data.<br>Unmatched paths use runtime SSR. | Generates the same static output, but a separate AWS asset service must serve it.<br>Unmatched Lambda requests use SSR. |
| `ssr: false` | Generates static output and an SPA fallback for static hosting | Generates static output and an SPA fallback for static hosting |

- With `ssr: true`, generated files are used first and unmatched routes continue to runtime SSR.
- With `ssr: false`, React Router emits static output and an SPA fallback for static hosting.
- AWS generates the same client output, but a separate asset service must serve it before requests reach Lambda.

The integration suite covers static and dynamic paths, async discovery, concurrency, SSR and SPA fallbacks, basenames, and custom application/build directories on every adapter.

See React Router's [pre-rendering guide](https://reactrouter.com/how-to/pre-rendering) for the full configuration contract.

The plugin reads React Router's resolved configuration and mounts the Hono-backed handler at the same basename.

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

### Vite plugin options

| Option | Purpose |
| --- | --- |
| `runtime` | Selects the production adapter; defaults to `node` |
| `serverEntryPoint` | Overrides discovery of `app/server.ts` or `app/server/index.ts` |
| `dev.exclude` | Extends the paths excluded from Hono dev-server handling |
| `dev.export` | Selects a named export from the server entry during development |

When no server entry is discovered, the plugin supplies a virtual default server for the selected runtime.

## Troubleshooting

| Problem | Resolution |
| --- | --- |
| Cloudflare plugin is missing | Add `cloudflare()` before both `reactRouterHonoServer()` and `reactRouter()` |
| Invalid hook calls or incompatible contexts | Remove aliases and duplicate framework installations, then perform one clean install |
| Server entry is not discovered | Create `app/server.ts`, create `app/server/index.ts`, or set `serverEntryPoint` |
| Load context fails at runtime | Return a `RouterContextProvider`, not a plain object |
| An asset request returns application HTML | Verify `buildDirectory`; on Cloudflare, also verify the `ASSETS` binding |
| Upgrading from the previous major | Follow [MIGRATION.md](./MIGRATION.md) and complete its clean-install checklist |

# React Router v7 Hono Server

<!-- ![GitHub Repo stars](https://img.shields.io/github/stars/rphlmr/react-router-hono-server?style=social)
![npm](https://img.shields.io/npm/v/open-source-stack?style=plastic)
![GitHub](https://img.shields.io/github/license/rphlmr/react-router-hono-server?style=plastic)
![npm](https://img.shields.io/npm/dy/open-source-stack?style=plastic)
![npm](https://img.shields.io/npm/dw/open-source-stack?style=plastic)
![GitHub top language](https://img.shields.io/github/languages/top/rphlmr/react-router-hono-server?style=plastic) -->

## Psst!
> [!IMPORTANT]
> This package is only compatible with React Router v7
>
> You can still use the v1 with @remix-run. [Previous docs](https://github.com/rphlmr/react-router-hono-server/tree/v1.2.0)
>
> Migration guide from v1 [here](#migrate-from-v1)

## TLDR
This package contains a helper function `createHonoServer` that enables you to create a Hono
server bound to your React Router v7 app.

Since the Hono server is built along with the rest of your app, you may import app modules as needed.

It also supports Vite HMR via the `react-router-hono-server/dev` plugin (which is required
for this to function).

It presets a default Hono server config that you can [customize](#options)


> [!IMPORTANT]
> Only works with React Router v7 in **ESM mode**
>
> Only works with **Vite**
>
> Only **Node**, **Bun**, **Cloudflare Workers** and **AWS Lambda** (experimental) are supported

> [!TIP]
> 👨‍🏫 There is some examples in the [examples](./examples) folder. I hope they will help you.
>
> You can use [remix-hono](https://github.com/sergiodxa/remix-hono) to add cool middleware like [`session`](https://github.com/sergiodxa/remix-hono?tab=readme-ov-file#session-management)

## Installation

Install the following npm package.

> [!NOTE]
> This is not a dev dependency, as it creates the Hono server used in production.

```bash
npm install react-router-hono-server hono @hono/node-server

# For Bun you can install @hono/node-server as a dev dependency
bun install -D @hono/node-server

# For Cloudflare Workers, add the following
npm install -D miniflare wrangler
```

> [!TIP]
> If you use `pnpm`, and want to use some imports from `hono`, you may need to install `hono` manually or create a `.npmrc` file in your project with the following content:
>
> ```
> public-hoist-pattern[]=hono
> ```

## Easy mode
In your `vite.config.ts`, add the `reactRouterHonoServer` plugin.

```ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev"; // add this
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouterHonoServer(), // add this
    reactRouter(),
    tsconfigPaths()
  ],
});
```
**That's all!**

Wait, what?

For really simple apps, that's all you need to do. Behind the hood, it will create a virtual module with a default Hono server.
When building for production, it will create the server file at `build/server/index.js` and import your React Router app from `virtual:react-router/server-build` module (replacing it with the real file located in `build/server/assets/server-build-[hash].js`).

## Configuration
Ok, by default it works, but you may want to customize the server and use some middleware.

> [!IMPORTANT]
> Until you define your own `serverEntryPoint`, the file name `${appDirectory}/server.ts` and the folder name `${appDirectory}/server` are reserved words.
>
> `reactRouterHonoServer` plugin is looking for them to find your server file.


### Add the Vite plugin
> [!NOTE]
> It uses the `reactRouter` plugin to build your app and will automatically load its config.

#### Node
> [!TIP]
> Check this [example](./examples/node/simple/) to see how to use it.

```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev"; // add this
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouterHonoServer(), // add this
    reactRouter(),
    tsconfigPaths()
  ],
});
```

#### Bun
> [!TIP]
> Check this [example](./examples/bun/simple/) to see how to use it.

> [!IMPORTANT]
> React 19 and `bun --bun` flag should work with the same `entry.server.tsx` file as Node. Check [Using `bun --bun` flag?](#using-bun---bun-flag)
> Check this [example](./examples/bun/simple-bun-runtime/) to see how to use it.

```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev"; // add this
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouterHonoServer({ runtime: "bun"} ), // add this
    reactRouter(),
    tsconfigPaths()
  ],
});
```

##### Using `bun --bun` flag?
> [!TIP]
> Check this [example](./examples/bun/simple-bun-runtime/) to see how to use it.

If you are using the [`bun --bun` flag](https://bun.sh/docs/cli/run#bun), you need to have the same `entry.server.tsx` file as Node.

When building for production, at least for React 19, it uses a special `react-dom-server.bun` import with only the `renderToReadableStream` function available.

React Router Hono Server vite plugin will alias that to `react-dom/server.node`


```ts
import { PassThrough } from "node:stream";

import type { AppLoadContext, EntryContext } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";

export const streamTimeout = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext,
  // If you have middleware enabled:
  // loadContext: unstable_RouterContextProvider
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");

    // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
    // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
    let readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady";

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    // Abort the rendering stream after the `streamTimeout` so it has time to
    // flush down the rejected boundaries
    setTimeout(abort, streamTimeout + 1000);
  });
}
```

#### Cloudflare Workers
> [!TIP]
> Check this [example](./examples/cloudflare/simple/) to see how to use it.

> [!IMPORTANT]
> You need to add the `cloudflareDevProxy` plugin to use the Cloudflare Workers runtime on dev.


```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare"; // add this
import { reactRouterHonoServer } from "react-router-hono-server/dev"; // add this
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cloudflareDevProxy(),
    reactRouterHonoServer({ runtime: "cloudflare"} ), // add this
    reactRouter(),
    tsconfigPaths()
  ],
});
```

##### React 19
> [!IMPORTANT]
> Check this [example](./examples/cloudflare/simple-19/) to see how to use it.

> [!TIP]
> You may need to add the `force_react_19` flag to the `reactRouterHonoServer` plugin config.

```ts
// vite.config.ts
reactRouterHonoServer({ runtime: "cloudflare", flag: { force_react_19: true } }), // add this
```

#### AWS Lambda
> [!TIP]
> AWS shares the same runtime as Node.
<!-- > Check this [example](./examples/node/simple/) to see how to use it. -->

```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev"; // add this
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouterHonoServer({ runtime: "aws", dev: { export: "handler" } }), // add this
    reactRouter(),
    tsconfigPaths()
  ],
});
```

### Create the server
> [!TIP]
> You can use the CLI to create the server file for you.
>
> ```bash
> npx react-router-hono-server reveal file
> ```

In your `app` folder, create a file named `server.ts` and export **as default** the server created by `createHonoServer`.

```bash
touch app/server.ts
```

```ts
// app/server.ts
import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer({/* options */});
```

#### Alternative
You can define your server in `app/server/index.ts`.

> [!TIP]
> You can use the CLI to create the server file for you.
>
> ```bash
> npx react-router-hono-server reveal folder
> ```

It is useful if you have many middleware and want to keep your server file clean.

```ts
// app/server/index.ts

import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer({/* options */});
```

#### I don't like this default
No problem, you can define your files wherever you want.

Use the `serverEntryPoint` option of the Vite plugin `reactRouterHonoServer` to point to your server file.


### Update your package.json scripts
### Node
It is not an error, you can keep the React Router defaults for `build` and `dev`!
```json
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "node ./build/server/index.js",
  },
```
### Bun
It is not an error, you can keep the React Router defaults for `build`!
```json
  "scripts": {
    "build": "react-router build",
    "dev": "bunx --bun vite",
    "start": "bun ./build/server/index.js",
  },
```

### Cloudflare
It is not an error, you can keep the React Router defaults for `build` and `dev`!
```json
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "wrangler dev",
  },
```

#### Wrangler
Add a file named `wrangler.toml` at the root of your project (close to `package.json`).

Adapt the `main` and `assets` fields based on your build output, if you changed them from the defaults.
```toml
workers_dev = true
name = "my-worker"
compatibility_date = "2024-11-18"
main = "./build/server/index.js"
assets = { directory = "./build/client/" }
```

##### Custom assets serving
You can set Cloudflare `experimental_serve_directly` and delegate assets serving to Hono, like for Node and Bun.

> [!TIP]
> Check https://developers.cloudflare.com/workers/static-assets/binding/#experimental_serve_directly

> [!TIP]
> Check this [example](./examples/cloudflare/simple/) to see how to use it.

```toml
[assets]
directory = "./build/client/"
binding = "ASSETS"
experimental_serve_directly = false
```

### AWS Lambda
It is not an error, you can keep the React Router defaults for `build` and `dev`!
```json
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "I don't know how to start it in production mode 😅",
  },
```

## How it works

This helper works differently depending on the environment.

In development, it uses [@hono/vite-dev-server](https://github.com/honojs/vite-plugins/tree/main/packages/dev-server) and loads your server and React Router app with `import('virtual:react-router/server-build')`.
It can be configured in `vite.config.ts`.

In `production`, it will create a standard node HTTP server listening at `HOST:PORT`.
You can customize the production server port using the `port` option of `createHonoServer`.

When building for production, the Hono server is compiled as `build/server/index.js` and imports your React Router app from `assets/server-build-[hash].js`.

To run the server in production, use `node ./build/server/index.js`.

That's all!

### Options

#### `reactRouterHonoServer` (Vite Plugin)
```ts
type Runtime = "node" | "bun" | "cloudflare" | "aws";

type ReactRouterHonoServerPluginOptions = {
  /**
   * The runtime to use for the server.
   *
   * Defaults to `node`.
   */
  runtime?: Runtime;
  /**
   * The path to the server file, relative to `vite.config.ts`.
   *
   * If it is a folder (`app/server`), it will look for an `index.ts` file.
   *
   * Defaults to `${appDirectory}/server[.ts | /index.ts]` if present.
   *
   * Fallback to a virtual module `virtual:react-router-hono-server/server`.
   */
  serverEntryPoint?: string;
  /**
   * The paths that are not served by the dev-server.
   *
   * Defaults include `appDirectory` content.
   */
  dev?: {
    /**
     * The paths that are not served by the dev-server.
     *
     * Defaults include `appDirectory` content.
     */
    exclude?: (string | RegExp)[];
    /**
     * The name of the export to use for the server.
     *
     * Defaults to `default`.
     */
    export?: string;
  };
};
```

#### `createHonoServer`
##### All adapters
```ts
export type HonoServerOptions<E extends Env = BlankEnv> = {
  /**
   * The base Hono app to use
   *
   * It will be used to mount the React Router server on the `basename` path
   * defined in the [React Router config](https://api.reactrouter.com/v7/types/_react_router_dev.config.Config.html)
   *
   * {@link Hono}
   */
  app?: Hono<E>;
  /**
   * Enable the default logger
   *
   * Defaults to `true`
   */
  defaultLogger?: boolean;
  /**
   * The port to start the server on
   *
   * Defaults to `process.env.PORT || 3000`
   */
  port?: number;
  /**
   * Customize the Hono server, for example, adding middleware
   *
   * It is applied after the default middleware and before the React Router middleware
   */
  configure?: <E extends Env = BlankEnv>(server: Hono<E>) => Promise<void> | void;
  /**
   * Augment the React Router AppLoadContext
   *
   * Don't forget to declare the AppLoadContext in your app, next to where you create the Hono server
   *
   * ```ts
   * declare module "react-router" {
   *   interface AppLoadContext {
   *     // Add your custom context here
   *     whatever: string;
   *   }
   * }
   * ```
   */
  getLoadContext?: (
    c: Context,
    options: {
      build: ServerBuild;
      mode: "development" | "production" | "test";
    }
  ) => Promise<AppLoadContext> | AppLoadContext;
  /**
   * Hook to add middleware that runs before any built-in middleware, including assets serving.
   *
   * You can use it to add protection middleware, for example.
   */
  beforeAll?: (app: Hono<E>) => Promise<void> | void;
};
```

You can add additional Hono middleware with the `configure` function. If you do not provide a function, it will create a default Hono server.

The `configure` function can be async. So, make sure to `await createHonoServer()`.

> NB: If you import some shared code in your server file (or middleware), Vite will code split the file (your server code will be in a separate chunk, re-exported as default in `build/server/index.js`).
>
> In this situation, if you  `await createHonoServer()` it will error with `Detected unsettled top-level await`. Just remove the `await` and it will work fine.

If you want to set up the React Router `AppLoadContext`, pass in a function to `getLoadContext`.

Modify the `AppLoadContext` interface used in your app.

Since the Hono server is compiled in the same bundle as the rest of your React Router app, you can import app modules just like you normally would.

###### Example

```ts
// app/server.ts

import { createHonoServer } from "react-router-hono-server/node";

/**
 * Declare our loaders and actions context type
 */
declare module "react-router" {
  interface AppLoadContext {
    /**
     * The app version from the build assets
     */
    readonly appVersion: string;
  }
}

export default await createHonoServer({
  getLoadContext(_, { build, mode }) {
    const isProductionMode = mode === "production";
    return {
      appVersion: isProductionMode ? build.assets.version : "dev",
    };
  },
});
```

```ts
// app/routes/test.tsx
import type { Route } from "./+types/test";
export async function loader({ context }: Route.LoaderArgs) {
  // get the context provided from `getLoadContext`
  return { appVersion: context.appVersion }
}
```

> [!TIP]
> If you declare your `getLoadContext` function in a separate file, you can use the helper `createGetLoadContext` from `react-router-hono-server/{adapter}`
> ```ts
> import { createGetLoadContext } from "react-router-hono-server/node";
>
> export const getLoadContext = createGetLoadContext((c, { mode, build }) => {
>   const isProductionMode = mode === "production";
>   return {
>     appVersion: isProductionMode ? build.assets.version : "dev",
>   };
> });
> ```

##### Node
```ts
export interface HonoServerOptions<E extends Env = BlankEnv> extends HonoServerOptionsBase<E> {
  /**
   * Listening listener (production mode only)
   *
   * It is called when the server is listening
   *
   * Defaults log the port
   */
  listeningListener?: (info: AddressInfo) => void;
  /**
   * Customize the node server (ex: using http2)
   *
   * {@link https://hono.dev/docs/getting-started/nodejs#http2}
   */
  customNodeServer?: CreateNodeServerOptions;
  /**
   * Callback executed just after `serve` from `@hono/node-server`
   *
   * **Only applied to production mode**
   *
   * For example, you can use this to bind `@hono/node-ws`'s `injectWebSocket`
   */
  onServe?: (server: ServerType) => void;
  /**
   * The Node.js Adapter rewrites the global Request/Response and uses a lightweight Request/Response to improve performance.
   *
   * If you want this behavior, set it to `true`
   *
   * 🚨 Setting this to `true` can break `request.clone()` if you later check `instanceof Request`.
   *
   * {@link https://github.com/honojs/node-server?tab=readme-ov-file#overrideglobalobjects}
   *
   * @default false
   */
  overrideGlobalObjects?: boolean;
  /**
   * Customize the hostname of the node server
   */
  hostname?: string;
  /**
   * Customize the serve static options
   */
  serveStaticOptions?: {
    /**
     * Customize the public assets (what's in your `public` directory) serve static options.
     *
     */
    publicAssets?: Omit<ServeStaticOptions<E>, "root">;
    /**
     * Customize the client assets (what's in your `build/client/assets` directory - React Router) serve static options.
     *
     */
    clientAssets?: Omit<ServeStaticOptions<E>, "root">;
  };
}
```

##### Bun
```ts
export interface HonoServerOptions<E extends Env = BlankEnv> extends HonoServerOptionsBase<E> {
  /**
   * Customize the bun server
   *
   * {@link https://bun.sh/docs/api/http#start-a-server-bun-serve}
   */
  customBunServer?: Serve & ServeOptions;
  /**
   * Customize the serve static options
   */
  serveStaticOptions?: {
    /**
     * Customize the public assets (what's in your `public` directory) serve static options.
     *
     */
    publicAssets?: Omit<ServeStaticOptions<E>, "root">;
    /**
     * Customize the client assets (what's in your `build/client/assets` directory - React Router) serve static options.
     *
     */
    clientAssets?: Omit<ServeStaticOptions<E>, "root">;
  };
}
```

##### Cloudflare Workers
```ts
export interface HonoServerOptions<E extends Env = BlankEnv> extends Omit<HonoServerOptionsBase<E>, "port"> {}
```

##### AWS Lambda
```ts
type InvokeMode = "default" | "stream";

interface HonoAWSServerOptions<E extends Env = BlankEnv> extends Omit<HonoServerOptionsBase<E>, "port"> {
  /**
   * The invoke mode to use
   *
   * Defaults to `default`
   *
   * {@link https://hono.dev/docs/getting-started/aws-lambda#lambda-response-streaming}
   */
  invokeMode: InvokeMode;
}
```

## Middleware

🚨 Redirecting from a middleware
> [!IMPORTANT]
> TLDR: If you encounter a `Error: Unable to decode turbo-stream response` after a redirect from your middleware, try to use `redirect` instead of `c.redirect`.
>
> `redirect` will use `c.redirect` for "normal" requests and a single-fetch-like response for React Router `.data` requests.
>
> If the next handler is a Hono middleware (ex: https://github.com/rphlmr/react-router-hono-server/discussions/56), you can use `c.redirect` as usual.
>
> You **have to** use the `redirect` helper to redirect from a middleware if the next handler that will receive this redirect is a React Router route.
>
> It returns a single-fetch-like response.
>
> If you use `c.redirect`, it will not work as expected and you will get a `Unable to decode turbo-stream response` error.
>
>```ts
> import { redirect } from "react-router-hono-server/http";
>```
>
> I'm sorry for this inconvenience, I hope it can be "fixed" in future React Router versions.

Middleware are functions that are called before React Router calls your loader/action.

Hono is the perfect tool for this, as it supports middleware out of the box.

See the [Hono docs](https://hono.dev/docs/guides/middleware) for more information.

You can imagine many use cases for middleware, such as authentication, protecting routes, caching, logging, etc.

See how [Shelf.nu](https://github.com/Shelf-nu/shelf.nu/blob/main/server/middleware.ts) uses them!

> [!TIP]
> This lib exports one middleware `cache` (`react-router-hono-server/middleware`) that you can use to cache your responses.

### `beforeAll`
You can use the `beforeAll` option to add middleware that runs before any built-in middleware, including assets serving.

You can use it to add protection middleware, for example.

> [!TIP]
> When you check the path to protect, don't forget to use `c.req.path.includes("")` to handle `.data` requests (`loader`)!

```ts
import { reactRouterRedirect } from "react-router-hono-server/http";
import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer({
  beforeAll(app) {
    app.use(async (c, next) => {
      if (c.req.path.includes("/protected") && !c.req.header("Authorization")) {
        return reactRouterRedirect("/login");
      }

      return next();
    });
  },
});
```

### Using remix-hono middleware

It is easy to use [remix-hono](https://github.com/sergiodxa/remix-hono) middleware with this package.

```ts
import { createCookieSessionStorage } from "react-router";
import { createHonoServer } from "react-router-hono-server/node";
import { session } from "remix-hono/session";

export default await createHonoServer({
  configure: (server) => {
    server.use(
      session({
        autoCommit: true,
        createSessionStorage() {
          const sessionStorage = createCookieSessionStorage({
            cookie: {
              name: "session",
              httpOnly: true,
              path: "/",
              sameSite: "lax",
              secrets: [process.env.SESSION_SECRET],
              secure: process.env.NODE_ENV === "production",
            },
          });

          return {
            ...sessionStorage,
            // If a user doesn't come back to the app within 30 days, their session will be deleted.
            async commitSession(session) {
              return sessionStorage.commitSession(session, {
                maxAge: 60 * 60 * 24 * 30, // 30 days
              });
            },
          };
        },
      })
    );
  },
});
```

### Creating custom Hono Middleware

You can create middleware using the [`createMiddleware`](https://hono.dev/docs/helpers/factory#createmiddleware) or [`createFactory`](https://hono.dev/docs/helpers/factory#createfactory) functions from `hono/factory`.

Then, use them with the `configure` function of `createHonoServer`.

```ts
import { createMiddleware } from "hono/factory";
import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer({
  configure: (server) => {
    server.use(
      createMiddleware(async (c, next) => {
        console.log("middleware");
        return next();
      })
    );
  },
});
```

### Using React Router Middleware (unstable future)
You can use React Router middleware with this package.

> [!TIP]
> Check this [example](./examples/node/simple-future-middleware/) to see how to use it.

> [!IMPORTANT]
> Please note that this is an unstable feature and could change in the future.
>
> If you already have a custom `getLoadContext` function, you now have to return a `Map` from it. Check the example for more information.


### Using WebSockets
#### Node
This package has a built-in helper to use `@hono/node-ws`

> [!TIP]
> Check this [example](./examples/node/websocket/) to see how to use it.

```ts
import type { WSContext } from "hono/ws";
import { createHonoServer } from "react-router-hono-server/node";

// Store connected clients
const clients = new Set<WSContext>();

export default await createHonoServer({
  useWebSocket: true,
  // 👆 Unlock this 👇 from @hono/node-ws
  configure: (app, { upgradeWebSocket }) => {
    app.get(
      "/ws",
      upgradeWebSocket((c) => ({
        // https://hono.dev/helpers/websocket
        onOpen(_, ws) {
          console.log("New connection ⬆️");
          clients.add(ws);
        },
        onMessage(event, ws) {
          console.log("Context", c.req.header("Cookie"));
          console.log("Event", event);
          console.log(`Message from client: ${event.data}`);
          // Broadcast to all clients except sender
          clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(`${event.data}`);
            }
          });
        },
        onClose(_, ws) {
          console.log("Connection closed");
          clients.delete(ws);
        },
      }))
    );
  },
});
```

#### Bun
This package has a built-in helper to use `hono/bun` in prod and `@hono/node-ws` in dev

> [!TIP]
> Check this [example](./examples/bun/websocket/) to see how to use it.

```ts
import { WSContext } from "hono/ws";
import { createHonoServer } from "react-router-hono-server/bun";

// Store connected clients
const clients = new Set<WSContext>();

export default await createHonoServer({
  useWebSocket: true,
  // 👆 Unlock this 👇 from @hono/node-ws in dev, hono/bun in prod
  configure(app, { upgradeWebSocket }) {
    app.get(
      "/ws",
      upgradeWebSocket((c) => ({
        // https://hono.dev/helpers/websocket
        onOpen(_, ws) {
          console.log("New connection 🔥");
          clients.add(ws);
        },
        onMessage(event, ws) {
          console.log("Context", c.req.header("Cookie"));
          console.log("Event", event);
          console.log(`Message from client: ${event.data}`);
          // Broadcast to all clients except sender
          clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(`${event.data}`);
            }
          });
        },
        onClose(_, ws) {
          console.log("Connection closed");
          clients.delete(ws);
        },
      }))
    );
  },
});
```

#### Cloudflare Workers
Cloudflare requires a different approach to WebSockets, based on Durable Objects.

> [!TIP]
> Check this [example](./examples/cloudflare/websocket/) to see how to use it.

> [!IMPORTANT]
> For now, HMR is not supported in Cloudflare Workers. Will try to come back to it later.
>
> Work in progress on Cloudflare team: https://github.com/flarelabs-net/vite-plugin-cloudflare

#### AWS
Not supported.

## Basename and Hono sub apps

> [!NOTE]
> By default, the React Router app is mounted at `/` (default `basename` value).
>
> You may not need to use this option. It's for advanced use cases.

> [!TIP]
> Check this [example](./examples/node/custom-mount/) to see how to use it.

You can use the `basename` option in your React Router config (`react-router.config.ts`) to mount your React Router app on a subpath.

It will automatically mount the app on the subpath.

```ts
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  basename: "/app", // Now the React Router app will be mounted on /app
} satisfies Config;
```

Then, you can use the `app` option in `createHonoServer` to pass your "root" Hono app. This will be used to mount the React Router app on the `basename` path.

```ts
import { Hono } from "hono";
import { createHonoServer } from "react-router-hono-server/node";
import { API_BASENAME, api } from "./api";
import { getLoadContext } from "./context";

// Create a root Hono app
const app = new Hono();

// Mount the API app at /api
app.route(API_BASENAME, api);

export default await createHonoServer({
  // Pass the root Hono app to the server.
  // It will be used to mount the React Router app on the `basename` defined in react-router.config.ts
  app,
  getLoadContext,
});
```
> [!NOTE]
> You now have two entry points!
> - `/api` - for your API
> - `/app` - for your React Router app

## Pre-rendering
You should be able to use pre-rendering with this package.

### Node and Bun
> [!TIP]
> Check this [example](./examples/node/with-pre-render/) to see how to use it.

> [!IMPORTANT]
> You need to add the `serverBuildFile` option to your `react-router.config.ts` file.
>
> The file path is fixed to `assets/server-build.js`.

Add the pre-render option to your `react-router.config.ts`

```ts
import type { Config } from "@react-router/dev/config";

export default {
  prerender: ["/"],
} satisfies Config;
```

### Cloudflare
> [!TIP]
> Check this [example](./examples/cloudflare/with-pre-render/) to see how to use it.

Add the pre-render option to your `react-router.config.ts`

```ts
import type { Config } from "@react-router/dev/config";

export default {
  prerender: ["/"],
} satisfies Config;
```


## Migrate from v1
_You should not expect any breaking changes._

### Install the latest version

```bash
npm install react-router-hono-server@latest
```

### Create the server file
#### Option 1 - You previously had all your server code in `app/entry.server.tsx`
```bash
touch app/server.ts
```
or
```bash
npx react-router-hono-server reveal file
```

#### Option 2 - You previously had your server code in a `server` folder
```bash
mkdir app/server
touch app/server/index.ts
```
or
```bash
npx react-router-hono-server reveal folder
```

### Move your server code
Move your previous server code to the new file you created in the previous step.

> [!NOTE]
> You can remove the import from `react-router-hono-server/node` in your `entry.server.tsx` file and any other server code.

Many options are gone, `serverBuildFile` `assetsDir` and `buildDirectory`.

We now use the Vite virtual import `virtual:react-router/server-build` to load the server build and we read the Vite config thanks to the `reactRouterHonoServer` plugin.

> [!IMPORTANT]
> You now need to export the server created by `createHonoServer` as **default**.
>
> ```ts
> import { createHonoServer } from "react-router-hono-server/node";
>
> export default await createHonoServer({/* other options */});
> ```

### Update your `vite.config.ts`

> [!IMPORTANT]
> `devServer` is now `reactRouterHonoServer`.

Many options are gone or have changed.

`exportName` (`reactRouterHonoServer` expects a default export from your server file), `entry` is now `serverEntryPoint`. `appDirectory` is removed (read from `vite.config.ts`), and `exclude` has been moved under `dev`.


##### You used `buildEnd` from `remix()` plugin or a custom `buildDirectory` option
You may know that it has been moved to `react-router.config.ts` (see [here](https://reactrouter.com/upgrading/remix#5-add-a-react-router-config) for more information).

If you used this hook for Sentry, check this [example](./examples/node/with-sentry/react-router.config.ts) to see how to migrate.

If you used a custom `buildDirectory` option, check this [example](./examples/node/custom-build/react-router.config.ts) to see how to migrate.

### Update your package.json scripts
```json
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "node ./build/server/index.js",
  },
```

## Special Thanks

Inspired by [remix-express-vite-plugin](https://github.com/kiliman/remix-express-vite-plugin) from [@kiliman](https://github.com/kiliman)

`remix` handler was forked from [remix-hono](https://github.com/sergiodxa/remix-hono) by [@sergiodxa](https://github.com/sergiodxa) as it is a small and simple core dependency of this library.

I will still help maintain it.

## Contributors ✨

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

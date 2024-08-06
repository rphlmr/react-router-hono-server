# React Router Hono Server

Inspired by [remix-express-vite-plugin](https://github.com/kiliman/remix-express-vite-plugin) from [@kiliman](https://github.com/kiliman)

<!-- ![GitHub Repo stars](https://img.shields.io/github/stars/rphlmr/react-router-hono-server?style=social)
![npm](https://img.shields.io/npm/v/open-source-stack?style=plastic)
![GitHub](https://img.shields.io/github/license/rphlmr/react-router-hono-server?style=plastic)
![npm](https://img.shields.io/npm/dy/open-source-stack?style=plastic)
![npm](https://img.shields.io/npm/dw/open-source-stack?style=plastic)
![GitHub top language](https://img.shields.io/github/languages/top/rphlmr/react-router-hono-server?style=plastic) -->

This package contains a helper function that enables you to create your Hono
server directly from you _entry.server.tsx_. Since the Hono server is built along
with the rest of your Remix app, you may import app modules as needed. It also
supports Vite HMR via the `react-router-hono-server/dev` plugin (which is required
for this to function).

It relies on [remix-hono](https://github.com/sergiodxa/remix-hono) and presets a default Hono server config that you can [customize](#options)

> [!IMPORTANT]
> Only works with Remix in **ESM mode**
>
> Only works with **Vite**
>
> Only works for **node**

> [!TIP]
> You can use [remix-hono](https://github.com/sergiodxa/remix-hono) to add cool middlewares like [`session`](https://github.com/sergiodxa/remix-hono?tab=readme-ov-file#session-management)

## Installation

Install the following npm package. NOTE: This is not a dev dependency, as it
creates the Hono server used in production.

```bash
npm install react-router-hono-server
```

## Configuration
### Create the server
From your _entry.server.tsx_ file, export the server from `createHonoServer` and
name it `server` or the name you defined in `devServer({exportName})` in your _vite.config.ts_.

```ts
// app/entry.server.tsx

import { createHonoServer } from "react-router-hono-server/node";

export const server = await createHonoServer();
```

### Add the Vite plugin
```ts
// vite.config.ts

import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { devServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals();

export default defineConfig({
  build: {
    target: "esnext",
  },
  plugins: [devServer(), remix(), tsconfigPaths()],
});
```
> [!IMPORTANT]
> Change the `target` to `esnext` in your _vite.config.ts_ file
>
> ```ts
> build: {
>   target: "esnext",
> },
> ```


### Update package.json scripts
```json
  "scripts": {
    "build": "NODE_ENV=production remix vite:build",
    "dev": "vite --host",
    "start": "NODE_ENV=production node ./build/server/index.js"
  },
```

## How it works

This helper function works differently depending on the environment.

For `development`, it creates an Hono server that the Vite plugin will load
via `viteDevServer.ssrLoadModule('virtual:remix/server-build')`.
The actual server is controlled by Vite through `@hono/vite-dev-server`, and can be configured via _vite.config.ts_ `server` options.

For `production`, it will create a standard node HTTP server listening at `HOST:PORT`.
You can customize the production server port using the `port` option of `createHonoServer`.

When building for production, the Hono server is compiled in the same bundle as the rest of your Remix app, you can import app modules just like you normally would.

To run the server in production, use `NODE_ENV=production node ./build/server/index.js`.

That's all!

### Options

```ts
export type HonoServerOptions = {
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
   * The directory where the server build files are located (defined in vite.config)
   *
   * Defaults to `build/server`
   *
   * See https://remix.run/docs/en/main/file-conventions/vite-config#builddirectory
   */
  buildDirectory?: string;
  /**
   * The file name of the server build file (defined in vite.config)
   *
   * Defaults to `index.js`
   *
   * See https://remix.run/docs/en/main/file-conventions/vite-config#serverbuildfile
   */
  serverBuildFile?: `${string}.js`;
  /**
   * The directory where the assets are located (defined in vite.config, build.assetsDir)
   *
   * Defaults to `assets`
   *
   * See https://vitejs.dev/config/build-options#build-assetsdir
   */
  assetsDir?: string;
  /**
   * Customize the Hono server, for example, adding middlewares
   *
   * It is applied after the default middlewares and before the remix middleware
   */
  configure?: (server: Hono) => Promise<void> | void;
  /**
   * Augment the Remix AppLoadContext
   *
   * Don't forget to declare the AppLoadContext in your app, next to where you create the Hono server
   *
   * ```ts
   * declare module "@remix-run/node" {
   *   interface AppLoadContext {
   *     // Add your custom context here
   *   }
   * }
   * ```
   */
  getLoadContext?: (
    c: Context,
    options: Pick<RemixMiddlewareOptions, "build" | "mode">
  ) => Promise<AppLoadContext> | AppLoadContext;
  /**
   * Listening listener (production mode only)
   *
   * It is called when the server is listening
   *
   * Defaults log the port
   */
  listeningListener?: (info: { port: number }) => void;
};
```

You can add additional Hono middleware with the `configure` function. If you
do not provide a function, it will create a default Hono server.
The `configure` function can be async. So, make sure to `await createHonoServer()`.

If you want to set up the Remix `AppLoadContext`, pass in a function to `getLoadContext`.
Modify the `AppLoadContext` interface used in your app.

Since the Hono server is compiled in the same bundle as the rest of your Remix
app, you can import app modules just like you normally would.

### Example

```ts
// app/entry.server.tsx

import { createHonoServer } from "react-router-hono-server/node";

/**
 * Declare our loaders and actions context type
 */
declare module "@remix-run/node" {
  interface AppLoadContext {
    /**
     * The app version from the build assets
     */
    readonly appVersion: string;
  }
}

export const server = await createHonoServer({
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

export async function loader({ context }: LoaderFunctionArgs) {
  // get the context provided from `getLoadContext`
  return { appVersion: context.appVersion }
}
```

## Middlewares

Middlewares are functions that are called before Remix calls your loader/action.

Hono is the perfect tool for this, as it supports middleware out of the box.

See the [Hono docs](https://hono.dev/docs/guides/middleware) for more information.

You can imagine many use cases for middlewares, such as authentication, protecting routes, caching, logging, etc.

See how [Shelf.nu](https://github.com/Shelf-nu/shelf.nu/blob/main/server/middleware.ts) uses them!

> [!TIP]
> This lib exports one middleware `cache` (`react-router-hono-server/middlewares`) that you can use to cache your responses.

### Using Remix Hono middlewares

It is easy to use [remix-hono](https://github.com/sergiodxa/remix-hono) middlewares with this package.

```ts
import { createCookieSessionStorage } from "@remix-run/node";
import { createHonoServer } from "react-router-hono-server/node";
import { session } from "remix-hono/session";

export const server = await createHonoServer({
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


### Creating custom Middleware

You can create middlewares using the [`createMiddleware`](https://hono.dev/docs/helpers/factory#createmiddleware) or [`createFactory`](https://hono.dev/docs/helpers/factory#createfactory) functions from `hono/factory`.

Then, use them with the `configure` function of `createHonoServer`.

```ts
import { createMiddleware } from "hono/factory";
import { createHonoServer } from "react-router-hono-server/node";

export const server = await createHonoServer({
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

## Contributors ✨

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

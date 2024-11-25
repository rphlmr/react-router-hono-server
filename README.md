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
> Only works for **node**

> [!TIP]
> 👨‍🏫 There is some examples in the [examples](./examples) folder. I hope they will help you.
>
> You can use [remix-hono](https://github.com/sergiodxa/remix-hono) to add cool middleware like [`session`](https://github.com/sergiodxa/remix-hono?tab=readme-ov-file#session-management)

## Installation

Install the following npm package.

> [!NOTE]
> This is not a dev dependency, as it creates the Hono server used in production.

```bash
npm install react-router-hono-server
```

> [!TIP]
> You don't need to install `hono` as it is included in this package.
>
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

### Add the Vite plugin (if not already)
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
> [!NOTE]
> It uses the `reactRouter` plugin to build your app and will automatically load its config.


### Update your package.json scripts
It is not an error, you can keep the React Router defaults for `build` and `dev`!
```json
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "NODE_ENV=production node ./build/server/index.js",
  },
```

## How it works

This helper works differently depending on the environment.

In development, it uses [@hono/vite-dev-server](https://github.com/honojs/vite-plugins/tree/main/packages/dev-server) and loads your server and React Router app with `import('virtual:react-router/server-build')`.
It can be configured in `vite.config.ts`.

In `production`, it will create a standard node HTTP server listening at `HOST:PORT`.
You can customize the production server port using the `port` option of `createHonoServer`.

When building for production, the Hono server is compiled as `build/server/index.js` and imports your React Router app from `assets/server-build-[hash].js`.

To run the server in production, use `NODE_ENV=production node ./build/server/index.js`.

That's all!

### Options
#### `createHonoServer`
```ts
export type HonoServerOptions<E extends Env = BlankEnv> = {
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
   * Listening listener (production mode only)
   *
   * It is called when the server is listening
   *
   * Defaults log the port
   */
  listeningListener?: (info: AddressInfo) => void;
  /**
   * Hono constructor options
   *
   * {@link HonoOptions}
   */
  honoOptions?: HonoOptions<E>;
  /**
   * Customize the node server (ex: using http2)
   *
   * {@link https://hono.dev/docs/getting-started/nodejs#http2}
   */
  customNodeServer?: CreateNodeServerOptions;
};
```

You can add additional Hono middleware with the `configure` function. If you do not provide a function, it will create a default Hono server.

The `configure` function can be async. So, make sure to `await createHonoServer()`.

If you want to set up the React Router `AppLoadContext`, pass in a function to `getLoadContext`.

Modify the `AppLoadContext` interface used in your app.

Since the Hono server is compiled in the same bundle as the rest of your React Router app, you can import app modules just like you normally would.

##### Example

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

#### `reactRouterHonoServer`
```ts
type ReactRouterHonoServerPluginOptions = {
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
  };
};
```

## Middleware

Middleware are functions that are called before React Router calls your loader/action.

Hono is the perfect tool for this, as it supports middleware out of the box.

See the [Hono docs](https://hono.dev/docs/guides/middleware) for more information.

You can imagine many use cases for middleware, such as authentication, protecting routes, caching, logging, etc.

See how [Shelf.nu](https://github.com/Shelf-nu/shelf.nu/blob/main/server/middleware.ts) uses them!

> [!TIP]
> This lib exports one middleware `cache` (`react-router-hono-server/middleware`) that you can use to cache your responses.

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

### Creating custom Middleware

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

### Migrate from v1
_You should not expect any breaking changes._

#### Install the latest version

```bash
npm install react-router-hono-server@latest
```

#### Create the server file
##### Option 1 - You previously had all your server code in `app/entry.server.tsx`
```bash
touch app/server.ts
```
or
```bash
npx react-router-hono-server reveal file
```

##### Option 2 - You previously had your server code in a `server` folder
```bash
mkdir app/server
touch app/server/index.ts
```
or
```bash
npx react-router-hono-server reveal folder
```

#### Move your server code
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

#### Update your `vite.config.ts`

> [!IMPORTANT]
> `devServer` is now `reactRouterHonoServer`.

Many options are gone or have changed.

`exportName` (`reactRouterHonoServer` expects a default export from your server file), `entry` is now `serverEntryPoint`. `appDirectory` is removed (read from `vite.config.ts`), and `exclude` has been moved under `dev`.


##### You used `buildEnd` from `remix()` plugin or a custom `buildDirectory` option
You may know that it has been moved to `react-router.config.ts` (see [here](https://reactrouter.com/upgrading/remix#5-add-a-react-router-config) for more information).

If you used this hook for Sentry, check this [example](./examples/react-router-sentry/react-router.config.ts) to see how to migrate.

If you used a custom `buildDirectory` option, check this [example](./examples/react-router-custom-build/react-router.config.ts) to see how to migrate.

#### Update your package.json scripts
```json
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "NODE_ENV=production node ./build/server/index.js",
  },
```

## Special Thanks

Inspired by [remix-express-vite-plugin](https://github.com/kiliman/remix-express-vite-plugin) from [@kiliman](https://github.com/kiliman)

`remix` handler was forked from [remix-hono](https://github.com/sergiodxa/remix-hono) by [@sergiodxa](https://github.com/sergiodxa) as it is a small and simple core dependency of this library.

I will still help maintain it.

## Contributors ✨

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

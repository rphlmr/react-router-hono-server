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

## Configuration
### Create the server
In your `app` folder, create a file named `server.ts` and export **as default** the server created by `createHonoServer`.

```bash
touch app/server.ts
```

> [!IMPORTANT]
> You need to import the build module using the `import()` function and loading the virtual module `virtual:react-router/server-build`.
>
> For technical reasons, it can't be imported for you within `createHonoServer`.

```ts
// app/server.ts
import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer({
  build: import(
    // @ts-expect-error - virtual module provided by React Router at build time
    "virtual:react-router/server-build"
  ),
});
```

#### Alternative
You can define your server in `app/server/index.ts`.

It is useful if you have many middleware and want to keep your server file clean.

```ts
// app/server/index.ts

import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer({
  build: import(
    // @ts-expect-error - virtual module provided by React Router at build time
    "virtual:react-router/server-build"
  ),
});
```

### Add the Vite plugin
```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { devServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    target: "esnext",
    rollupOptions: isSsrBuild
      ? {
          input: "app/server.ts", // or app/server/index.ts if you choose the folder way
        }
      : undefined,
  },
  plugins: [
    devServer(),
    reactRouter(),
    tsconfigPaths()
  ],
}));
```
> [!IMPORTANT]
> Key points:
> - Change the `target` to `esnext` in your _vite.config.ts_ file
> - Set the `input` to the path of your server file in your _vite.config.ts_ file


### Update your package.json scripts
It is not an error, you can keep the React Router defaults!
```json
  "scripts": {
    "build": "NODE_ENV=production react-router build",
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

When building for production, the Hono server is compiled as `build/server/index.js` and imports your React Router app.

To run the server in production, use `NODE_ENV=production node ./build/server/index.js`.

That's all!

### Options

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
   * The directory where the server build files are located (defined in vite.config)
   *
   * Defaults to `build`
   *
   * See https://remix.run/docs/en/main/file-conventions/vite-config#builddirectory
   */
  buildDirectory?: string;
  /**
   * The directory where the assets are located (defined in vite.config, build.assetsDir)
   *
   * Defaults to `assets`
   *
   * See https://vitejs.dev/config/build-options#build-assetsdir
   */
  assetsDir?: string;
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

### Example

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
  build: import(
    // @ts-expect-error - virtual module provided by React Router at build time
    "virtual:react-router/server-build"
  ),
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

You can create middleware using the [`createMiddleware`](https://hono.dev/docs/helpers/factory#createmiddleware) or [`createFactory`](https://hono.dev/docs/helpers/factory#createfactory) functions from `hono/factory`.

Then, use them with the `configure` function of `createHonoServer`.

```ts
import { createMiddleware } from "hono/factory";
import { createHonoServer } from "react-router-hono-server/node";

export const server = await createHonoServer({
  build: import(
    // @ts-expect-error - virtual module provided by React Router at build time
    "virtual:react-router/server-build"
  ),
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

##### Option 2 - You previously had your server code in a `server` folder
```bash
mkdir app/server
touch app/server/index.ts
```

#### Move your server code
Move your previous server code to the new file you created in the previous step.

> [!NOTE]
> You can remove the import from `react-router-hono-server/node` in your `entry.server.tsx` file and any other server code.

One option is gone, `serverBuildFile`. We now use the Vite virtual import `virtual:react-router/server-build` to load the server build.

> [!IMPORTANT]
> You now need to export the server created by `createHonoServer` as **default**.
>
> ```ts
> import { createHonoServer } from "react-router-hono-server/node";
>
> export default await createHonoServer({
>   build: import(
>     // @ts-expect-error - virtual module provided by React Router at build time
>     "virtual:react-router/server-build"
>   ),
>  // other options
> });
> ```

#### Update your `vite.config.ts`

One option is gone for `devServer`, `exportName` as it now expects a default export from your server file.

> [!IMPORTANT]
> You need to add a new `build.rollupOptions.input` option to your `vite.config.ts` file (see [here](#add-the-vite-plugin) for more information).
>
> ```diff ts
> // vite.config.ts
> import { reactRouter } from "@react-router/dev/vite";
> import { devServer } from "react-router-hono-server/dev";
> import { defineConfig } from "vite";
> import tsconfigPaths from "vite-tsconfig-paths";
>
> export default defineConfig(({ isSsrBuild }) => ({
>   build: {
>     target: "esnext",
>+     rollupOptions: isSsrBuild
>+       ? {
>+           input: "app/server.ts", // or app/server/index.ts if you choose the folder way
>+         }
>+       : undefined,
>   },
>   plugins: [
>     devServer(),
>     reactRouter(),
>     tsconfigPaths()
>   ],
> }));
> ```

##### You used `buildEnd` from `remix()` plugin or a custom `buildDirectory` option
You may know that it has been moved to `react-router.config.ts` (see [here](https://reactrouter.com/upgrading/remix#5-add-a-react-router-config) for more information).

If you used this hook for Sentry, check this [example](./examples/react-router-sentry/react-router.config.ts) to see how to migrate.

If you used a custom `buildDirectory` option, check this [example](./examples/react-router-custom-build/react-router.config.ts) to see how to migrate.

## Special Thanks

Inspired by [remix-express-vite-plugin](https://github.com/kiliman/remix-express-vite-plugin) from [@kiliman](https://github.com/kiliman)

`remix` handler was forked from [remix-hono](https://github.com/sergiodxa/remix-hono) by [@sergiodxa](https://github.com/sergiodxa) as it is a small and simple core dependency of this library.

I will still help maintain it.

## Contributors ✨

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

import type { Context, Env, Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import type { RouterContextProvider, ServerBuild } from "react-router";

export type ReactRouterHonoServerAppLoadContext = RouterContextProvider;

export interface HonoServerOptionsBase<E extends Env> {
  /**
   * The base Hono app to use as a replacement for the default one created automatically
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
   * Create the React Router load context.
   *
   * React Router 8 requires a `RouterContextProvider`. Define values with
   * `createContext` and set them on the provider.
   *
   * ```ts
   * const context = new RouterContextProvider();
   * context.set(userContext, user);
   * return context;
   * ```
   */
  getLoadContext?: (
    c: Context<E>,
    options: {
      build: ServerBuild;
      mode: string;
    }
  ) => Promise<ReactRouterHonoServerAppLoadContext> | ReactRouterHonoServerAppLoadContext;
  /**
   * Hook to add middleware that runs before any built-in middleware, including assets serving.
   *
   * You can use it to add protection middleware, for example.
   */
  beforeAll?: (app: Hono<E>) => Promise<void> | void;
}

export interface WithWebsocket<E extends Env, TUpgradeWebSocket = UpgradeWebSocket> {
  /**
   * Enable WebSockets support in `configure`
   *
   * Development uses the runtime's native implementation or the `@hono/node-server` bridge.
   *
   * Defaults to `false`
   */
  useWebSocket: true;
  /**
   * Customize the Hono server, for example, adding middleware
   *
   * It is applied after the default middleware and before the React Router middleware
   */
  configure: (app: Hono<E>, options: { upgradeWebSocket: TUpgradeWebSocket }) => Promise<void> | void;
}

export interface WithoutWebsocket<E extends Env> {
  /**
   * Enable WebSockets support in `configure`
   *
   * Development uses the runtime's native implementation or the `@hono/node-server` bridge.
   *
   * Defaults to `false`
   */
  useWebSocket?: false | undefined;
  /**
   * Customize the Hono server, for example, adding middleware
   *
   * It is applied after the default middleware and before the React Router middleware
   */
  configure?: (app: Hono<E>) => Promise<void> | void;
}

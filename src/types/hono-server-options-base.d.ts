import type { Context, Env, Hono } from "hono";
import type { HonoOptions } from "hono/hono-base";
import type { UpgradeWebSocket } from "hono/ws";
import type { AppLoadContext, ServerBuild } from "react-router";

export interface HonoServerOptionsBase<E extends Env> {
  /**
   * Hono app to use
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
      mode: string;
    }
  ) => Promise<AppLoadContext> | AppLoadContext;
  /**
   * @deprecated Use `app` instead
   */
  honoOptions?: HonoOptions<E>;
}

export interface WithWebsocket<E extends Env> {
  /**
   * Enable WebSockets support in `configure`
   *
   * For `bun` and `cloudflare` we will use the `@hono/node-ws`'s `injectWebSocket` on dev (only),
   *
   * Defaults to `false`
   */
  useWebSocket: true;
  /**
   * Customize the Hono server, for example, adding middleware
   *
   * It is applied after the default middleware and before the React Router middleware
   */
  configure: (app: Hono<E>, options: { upgradeWebSocket: UpgradeWebSocket }) => Promise<void> | void;
}

export interface WithoutWebsocket<E extends Env> {
  /**
   * Enable WebSockets support in `configure`
   *
   * For `bun` and `cloudflare` we will use the `@hono/node-ws`'s `injectWebSocket` on dev (only),
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

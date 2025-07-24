import type { IncomingMessage, Server } from "node:http";
import type { Http2SecureServer, Http2Server } from "node:http2";
import type { ServerType } from "@hono/node-server";
import type { Serve } from "bun";
import type { Env, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { type UpgradeWebSocket, defineWebSocketHelper } from "hono/ws";
import type { ServerBuild } from "react-router";
import type { HonoServerOptionsBase } from "./types/hono-server-options-base";
import type { Runtime } from "./types/runtime";

type NodeServer = Server | Http2Server | Http2SecureServer;

type BunServer = Serve;

type AnyServer = NodeServer | BunServer;

interface WebSocket {
  upgradeWebSocket: UpgradeWebSocket;
  injectWebSocket: <Server extends AnyServer>(server: Server) => Server;
}

const defaultWebSocket = {
  upgradeWebSocket: defineWebSocketHelper(() => {}),
  injectWebSocket: (server) => server,
} satisfies WebSocket;

type Config = { app: Hono<any>; enabled: boolean };

/**
 * Create WebSocket factory
 *
 * It harmonizes the WebSocket implementation between `node`, `bun` and `cloudflare`
 *
 * For `bun` and `cloudflare`, in dev (which uses a node server), we hot-swap their native implementation with `@hono/node-ws`. This is the secret sauce!
 *
 * **Implementation details: It will strip unused code from other runtimes at build time**
 *
 * We do that to avoid issues on platforms that don't support node or bun APIs (like Cloudflare)
 */
export async function createWebSocket({ app, enabled }: Config): Promise<WebSocket> {
  if (!enabled) {
    return defaultWebSocket;
  }
  const mode = process.env.NODE_ENV === "development" ? "development" : "production";
  const DEV = mode === "development";
  const runtime = import.meta.env.REACT_ROUTER_HONO_SERVER_RUNTIME as Runtime;

  if (DEV || runtime === "node") {
    const { createNodeWebSocket } = await import("@hono/node-ws");
    const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

    return {
      upgradeWebSocket,
      injectWebSocket(server) {
        injectWebSocket(server as NodeServer);
        return server;
      },
    };
  }

  if (runtime === "bun") {
    const { createBunWebSocket } = await import("hono/bun");
    const { upgradeWebSocket, websocket } = createBunWebSocket();

    return {
      upgradeWebSocket,
      injectWebSocket: (server) => {
        return {
          ...server,
          websocket,
        };
      },
    };
  }

  return defaultWebSocket;
}

/**
 * Clean all user-defined upgrade listeners, except HMR
 *
 * Avoid conflicts on `already upgraded connections` when using `@hono/node-ws` on dev
 *
 */
export function cleanUpgradeListeners(httpServer: ServerType) {
  const upgradeListeners = httpServer
    .listeners("upgrade")
    .filter((listener) => listener.name !== "hmrServerWsListener");

  for (const listener of upgradeListeners) {
    httpServer.removeListener(
      "upgrade",
      /* @ts-ignore - we don't care */
      listener
    );
  }
}

/**
 * Patch all user-defined upgrade listeners, except HMR
 *
 * Avoid upgrading `vite-hmr` if `upgrade` listeners are added to the `httpServer` through `onServe` callback
 *
 */
export function patchUpgradeListener(httpServer: ServerType) {
  const upgradeListeners = httpServer
    .listeners("upgrade")
    .filter((listener) => listener.name !== "hmrServerWsListener");

  for (const listener of upgradeListeners) {
    // remove the original listener
    httpServer.removeListener(
      "upgrade",
      /* @ts-ignore - we don't care */
      listener
    );

    // re-add the listener back, filtering out `vite-hmr`
    httpServer.on("upgrade", (request, ...rest) => {
      if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
        return;
      }

      return listener(request, ...rest);
    });
  }
}

type SocketInfo = Partial<IncomingMessage["socket"]>;

/**
 * Bind socket info from the headers to the Hono context
 *
 * Unlock the usage of https://hono.dev/docs/helpers/conninfo in dev
 */
export function bindIncomingRequestSocketInfo() {
  return createMiddleware((c, next) => {
    c.env.server = {
      incoming: {
        socket: {
          remoteAddress: c.req.raw.headers.get("x-remote-address") || undefined,
          remotePort: Number(c.req.raw.headers.get("x-remote-port")) || undefined,
          remoteFamily: c.req.raw.headers.get("x-remote-family") || undefined,
        } satisfies SocketInfo,
      },
    };

    return next();
  });
}

/**
 * Import React Router server build
 */
export async function importBuild(): Promise<ServerBuild> {
  return await import(
    // @ts-expect-error - Virtual module provided by React Router at build time
    "virtual:react-router/server-build"
  );
}

/**
 * Helper to create a getLoadContext function fully typed
 */
export function createGetLoadContext(getLoadContext: HonoServerOptionsBase<Env>["getLoadContext"]) {
  return getLoadContext;
}

/**
 * Get the build mode from the environment
 */
export function getBuildMode() {
  return process.env.NODE_ENV === "development" ? "development" : "production";
}

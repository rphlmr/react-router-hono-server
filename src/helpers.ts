import type { Server } from "node:http";
import type { Http2SecureServer, Http2Server } from "node:http2";
import type { ServerType } from "@hono/node-server";
import type { Serve } from "bun";
import type { Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import type { Runtime } from "./types/runtime";

type NodeServer = Server | Http2Server | Http2SecureServer;

type BunServer = Serve;

type AnyServer = NodeServer | BunServer;

interface WebSocket {
  upgradeWebSocket: UpgradeWebSocket;
  injectWebSocket: <Server extends AnyServer>(server: Server) => Server;
}

const defaultWebSocket = {
  upgradeWebSocket: () => async () => {},
  injectWebSocket: (server) => server,
} satisfies WebSocket;

type Config<R extends Runtime> = { app: Hono<any>; runtime: R; enabled: boolean };

/**
 * Create WebSocket factory
 *
 * It harmonizes the WebSocket implementation between `node`, `bun` and `cloudflare`
 *
 * For `bun` and `cloudflare`, in dev (which uses a node server), we hot-swap their native implementation with `@hono/node-ws`.
 *
 * This is the secret sauce!
 */
export async function createWebSocket({ app, runtime, enabled }: Config<Runtime>): Promise<WebSocket> {
  if (!enabled) {
    return defaultWebSocket;
  }

  switch (runtime) {
    case "node": {
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
    case "bun": {
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
    case "cloudflare": {
      const { upgradeWebSocket } = await import("hono/cloudflare-workers");

      return {
        upgradeWebSocket,
        injectWebSocket: defaultWebSocket.injectWebSocket,
      };
    }
    default: {
      return defaultWebSocket;
    }
  }
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

import type { ServerType } from "@hono/node-server";
import type { NodeWebSocket as _NodeWebSocket } from "@hono/node-ws";
import type { Serve, ServeOptions } from "bun";
import type { Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import type { Runtime } from "./types/runtime";

export type MetaEnv<T> = {
  [K in keyof T as `import.meta.env.${string & K}`]: T[K];
};

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

type NodeWebSocket = {
  upgradeWebSocket: UpgradeWebSocket;
  injectWebSocket: <S>(server: S) => void;
};

type CustomBunServer = Serve &
  ServeOptions & {
    websocket?: unknown;
  };

type BunWebSocket = {
  upgradeWebSocket: UpgradeWebSocket;
  injectWebSocket: (server: CustomBunServer) => CustomBunServer;
};

type CloudflareWebSocket = {
  upgradeWebSocket: UpgradeWebSocket;
  injectWebSocket: <S>(s: S) => S;
};

type NoWebSocket = {
  upgradeWebSocket: UpgradeWebSocket;
  injectWebSocket: <S>(s: S) => S;
};

type NodeServer = Parameters<_NodeWebSocket["injectWebSocket"]>[0];

type BunServer = Serve;

type AnyServer = NodeServer | BunServer;

interface WebSocket {
  upgradeWebSocket: UpgradeWebSocket;
  // injectWebSocket(server: NodeServer): NodeServer;
  // injectWebSocket(server: BunServer): BunServer;
  // // injectWebSocket(server: AnyServer): AnyServer;
  injectWebSocket: <Server extends AnyServer>(server: Server) => Server;
}

const defaultWebSocket = {
  upgradeWebSocket: () => async () => {},
  injectWebSocket: (server) => server,
} satisfies WebSocket;

type RuntimeOrDisabled = Runtime | undefined;

type Config<R extends RuntimeOrDisabled> = { app: Hono<any>; runtime: R };

// type WebSocketReturn<R extends RuntimeOrDisabled> = R extends "node"
//   ? NodeWebSocket
//   : R extends "bun"
//     ? BunWebSocket
//     : R extends "cloudflare"
//       ? CloudflareWebSocket
//       : NoWebSocket;

// export async function createWebSocket<R extends RuntimeOrDisabled>({
//   app,
//   runtime,
// }: Config<R>): Promise<WebSocketReturn<R>>;
export async function createWebSocket({ app, runtime }: Config<RuntimeOrDisabled>): Promise<WebSocket> {
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
        injectWebSocket: (server) => ({
          ...server,
          websocket,
        }),
      };
    }
    case "cloudflare": {
      const { upgradeWebSocket } = await import("hono/cloudflare-workers");

      return {
        upgradeWebSocket,
        injectWebSocket: (server) => server,
      };
    }
    default: {
      return {
        upgradeWebSocket: () => async () => {},
        injectWebSocket: (server) => server,
      };
    }
  }
}

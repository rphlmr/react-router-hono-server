import type { ServerType } from "@hono/node-server";
import type { Env, Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import type { IncomingMessage, Server, createServer } from "node:http";
import type { Http2SecureServer, Http2Server } from "node:http2";
import type { Duplex } from "node:stream";
import type { ServerBuild } from "react-router";
import type * as WsModule from "ws";

import { createMiddleware } from "hono/factory";

import type { HonoServerOptionsBase } from "./types/hono-server-options-base";
import type { Runtime } from "./types/runtime";

type NodeServer = Server | Http2Server | Http2SecureServer;

type UpgradeListener = (request: IncomingMessage, socket: Duplex, head: Buffer) => void;

type BunServeOptions = Bun.Serve.Options<unknown, string>;

type AnyServer = NodeServer | BunServeOptions;

interface WebSocket {
  upgradeWebSocket: UpgradeWebSocket;
  injectWebSocket: <Server extends AnyServer>(server: Server) => Server;
  nodeWebSocket?: { server: WsModule.WebSocketServer };
}

const defaultWebSocket = {
  upgradeWebSocket: (() => {}) as unknown as UpgradeWebSocket,
  injectWebSocket: (server) => server,
} satisfies WebSocket;

type Config = { app: Hono<any>; enabled: boolean };

async function importNodeWebSocket(runtime: Runtime, mode: "development" | "production") {
  try {
    if (runtime === "bun" && typeof Bun !== "undefined") {
      // Bun replaces the bare `ws` import with a compatibility shim that cannot
      // attach to Vite's HTTP server. Load the installed Node implementation explicitly.
      const { createRequire } = await import("node:module");
      const require = createRequire(import.meta.url);
      const entry = require.resolve("ws/package.json").replace(/package\.json$/, "index.js");
      return require(entry) as typeof WsModule;
    }

    return await import("ws");
  } catch (cause) {
    throw new Error(
      `WebSocket support for the "${runtime}" runtime in ${mode} requires the optional "ws" peer dependency. Install "ws" before enabling useWebSocket.`,
      { cause },
    );
  }
}

/**
 * Create WebSocket factory
 *
 * It harmonizes the WebSocket implementation between supported runtimes.
 *
 * Node, Bun development, and Deno development use `@hono/node-server`.
 * Cloudflare always uses Workerd's native implementation.
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

  if (runtime === "cloudflare") {
    const { upgradeWebSocket } = await import("hono/cloudflare-workers");

    return {
      upgradeWebSocket: upgradeWebSocket as UpgradeWebSocket,
      injectWebSocket: (server) => server,
    };
  }

  if (runtime === "node" || (DEV && (runtime === "bun" || runtime === "deno"))) {
    const [{ createAdaptorServer, upgradeWebSocket }, { WebSocketServer }] = await Promise.all([
      import("@hono/node-server"),
      importNodeWebSocket(runtime, mode),
    ]);
    const wss = new WebSocketServer({ noServer: true });
    const websocket = { server: wss };

    return {
      upgradeWebSocket,
      injectWebSocket(server) {
        createAdaptorServer({
          fetch: app.fetch,
          websocket,
          // `createAdaptorServer` only uses this factory's return value to attach
          // its WebSocket listeners to Vite's already-running HTTP server.
          createServer: (() => server as NodeServer) as typeof createServer,
        });
        return server;
      },
      nodeWebSocket: websocket,
    };
  }

  if (runtime === "bun") {
    const { createBunWebSocket } = await import("hono/bun");
    const { upgradeWebSocket, websocket } = createBunWebSocket();

    return {
      upgradeWebSocket,
      injectWebSocket: (server) => {
        return {
          // oxlint-disable-next-line typescript/no-misused-spread
          ...server,
          websocket,
        };
      },
    };
  }

  if (runtime === "deno") {
    const { upgradeWebSocket } = await import("hono/deno");

    return {
      upgradeWebSocket: upgradeWebSocket as UpgradeWebSocket,
      injectWebSocket: (server) => server,
    };
  }

  return defaultWebSocket;
}

/**
 * Attach the Node WebSocket bridge to Vite's HTTP server without intercepting HMR.
 */
export function attachWebSocketToVite(
  injectWebSocket: WebSocket["injectWebSocket"],
  onServe?: (server: ServerType) => void,
) {
  const httpServer = globalThis.__viteDevServer?.httpServer;

  if (!httpServer) {
    return false;
  }

  cleanUpgradeListeners(httpServer);
  onServe?.(httpServer);
  injectWebSocket(httpServer);
  patchUpgradeListener(httpServer);

  return true;
}

/**
 * Clean all user-defined upgrade listeners, except HMR
 *
 * Avoid conflicts on already-upgraded connections when using Node WebSockets in dev.
 *
 */
export function cleanUpgradeListeners(httpServer: ServerType) {
  const upgradeListeners = httpServer
    .listeners("upgrade")
    .filter((listener) => listener.name !== "hmrServerWsListener") as UpgradeListener[];

  for (const listener of upgradeListeners) {
    httpServer.removeListener("upgrade", listener);
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
    .filter((listener) => listener.name !== "hmrServerWsListener") as UpgradeListener[];

  for (const listener of upgradeListeners) {
    // remove the original listener
    httpServer.removeListener("upgrade", listener);

    // re-add the listener back, filtering out `vite-hmr`
    httpServer.on("upgrade", (request, socket, head) => {
      if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
        return;
      }

      return listener(request, socket, head);
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
 * Prevent Chrome DevTools workspace discovery from reaching React Router's catch-all route.
 *
 * Public files and user-defined routes are registered first so applications can opt into
 * automatic workspace discovery.
 */
export function handleChromeDevToolsWorkspaceRequest<E extends Env>(app: Hono<E>) {
  app.get("/.well-known/appspecific/com.chrome.devtools.json", (c) => c.notFound());
}

/**
 * Import React Router server build
 */
export async function importBuild(): Promise<ServerBuild> {
  return import(
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

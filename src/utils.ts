import type { ServerType } from "@hono/node-server";

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

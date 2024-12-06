import { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { createHonoServer } from "react-router-hono-server/cloudflare";
import { WebSocketManager } from "./websocket-manager";

export { WebSocketManager };

type Env = {
  Bindings: {
    WEBSOCKET_MANAGER: DurableObjectNamespace<WebSocketManager>;
  };
};

function getWebSocketManager(c: Context<Env>) {
  const id = c.env.WEBSOCKET_MANAGER.idFromName("ws");
  return c.env.WEBSOCKET_MANAGER.get(id);
}

export default await createHonoServer<Env>({
  configure(app) {
    app.get(
      "/ws",
      createMiddleware<Env>(async (c) => {
        // Make sure the request is a WebSocket request
        const upgradeHeader = c.req.header("Upgrade");

        if (!upgradeHeader || upgradeHeader !== "websocket") {
          return new Response("Durable Object expected Upgrade: websocket", {
            status: 426,
          });
        }

        const webSocketManager = getWebSocketManager(c);
        // Return the Durable Object response (aka the WebSocket connection from the Durable Object to the client)
        return webSocketManager.fetch(c.req.raw);
      })
    );
  },
  getLoadContext(c: Context<Env>) {
    return {
      // The fun start here!
      // Send a message to a specific client
      sendMessage(to, message) {
        getWebSocketManager(c).sendMessage(to, message);
      },
    };
  },
});

/**
 * Declare our loaders and actions context type
 */
declare module "react-router" {
  interface AppLoadContext {
    /**
     * Send a message to a specific client
     */
    readonly sendMessage: (to: string, message: string) => void;
  }
}

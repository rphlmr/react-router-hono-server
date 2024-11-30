import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { WSContext } from "hono/ws";
import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Store connected clients
const clients = new Set<WSContext>();

export default await createHonoServer({
  app,
  onServe(server) {
    injectWebSocket(server);
  },
  configure(app) {
    app.get(
      "/ws",
      upgradeWebSocket(() => ({
        // https://hono.dev/helpers/websocket
        onOpen(_, ws) {
          console.log("New connection ");
          clients.add(ws);
        },
        onMessage(event, ws) {
          console.log(`Message from client: ${event.data}`);
          // Broadcast to all clients except sender
          clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(`${event.data}`);
            }
          });
        },
        onClose(_, ws) {
          console.log("Connection closed");
          clients.delete(ws);
        },
      }))
    );
  },
});

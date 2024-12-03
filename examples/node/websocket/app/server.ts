import type { WSContext } from "hono/ws";
import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");

// Store connected clients
const clients = new Set<WSContext>();

export default await createHonoServer({
  useWebSocket: true,
  configure: (app, { upgradeWebSocket }) => {
    app.get(
      "/ws",
      upgradeWebSocket((c) => ({
        // https://hono.dev/helpers/websocket
        onOpen(_, ws) {
          console.log("New connection ⬆️");
          clients.add(ws);
        },
        onMessage(event, ws) {
          console.log("Context", c.req.header("Cookie"));
          console.log("Event", event);
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

import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { createHonoServer } from "react-router-hono-server/node";

console.log("loading server");

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

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
        onOpen() {
          console.log("New connection 🔥");
        },
        onMessage(event, ws) {
          console.log(`Message from client: ${event.data}`);
          ws.send(`${event.data}`);
        },
        onClose: () => {
          console.log("Connection closed");
        },
      }))
    );
  },
});

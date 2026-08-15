import { createHonoServer as createBunServer } from "../src/adapters/bun";
import { createHonoServer as createCloudflareServer } from "../src/adapters/cloudflare";
import { createHonoServer as createDenoServer } from "../src/adapters/deno";
import { createHonoServer as createNodeServer } from "../src/adapters/node";

export function websocketTypeContracts() {
  void createNodeServer({
    useWebSocket: true,
    configure(_app, { upgradeWebSocket, wss }) {
      for (const socket of wss.clients) {
        socket.ping();
      }
      upgradeWebSocket(() => ({
        onOpen(_event, ws) {
          ws.send("connected");
        },
      }));
    },
  });

  void createBunServer({
    useWebSocket: true,
    configure(_app, { upgradeWebSocket }) {
      upgradeWebSocket(() => ({
        onOpen(_event, ws) {
          ws.send("connected");
        },
      }));
    },
  });

  void createDenoServer({
    useWebSocket: true,
    configure(_app, { upgradeWebSocket }) {
      upgradeWebSocket(() => ({
        onOpen(_event, ws) {
          ws.send("connected");
        },
      }));
    },
  });

  void createCloudflareServer({
    useWebSocket: true,
    configure(_app, { upgradeWebSocket }) {
      type CloudflareEvents = NonNullable<Parameters<typeof upgradeWebSocket>[1]>;
      const unsupportedEvents: CloudflareEvents = {
        // @ts-expect-error Cloudflare Workers does not support onOpen.
        onOpen() {},
      };
      void unsupportedEvents;

      upgradeWebSocket(() => ({
        onMessage(event, ws) {
          ws.send(event.data as string);
        },
      }));
    },
  });
}

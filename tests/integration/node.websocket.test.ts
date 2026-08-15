import { afterEach, describe, expect, test } from "vitest";
import { type FixtureApp, ProductionFixture } from "../helpers/fixture";

const websocketServer = `import { createHonoServer } from "react-router-hono-server/node";

export default await createHonoServer({
  useWebSocket: true,
  configure(app, { upgradeWebSocket }) {
    app.get(
      "/ws",
      upgradeWebSocket(() => ({
        onMessage(event, ws) {
          ws.send(\`echo:\${event.data}\`);
        },
      }))
    );
  },
});
`;

let app: FixtureApp | undefined;

afterEach(async () => {
  await app?.stop();
  app = undefined;
});

describe("Node WebSockets", () => {
  test("echoes messages in development", async () => {
    app = await ProductionFixture.create("basic", "node");
    await app.edit("app/server.ts", websocketServer);
    await app.startDev();

    await expectWebSocketEcho(app);
  });

  test("echoes messages in production", async () => {
    app = await ProductionFixture.create("basic", "node");
    await app.edit("app/server.ts", websocketServer);
    await app.build();
    await app.startProduction();

    await expectWebSocketEcho(app);
  });
});

async function expectWebSocketEcho(fixture: FixtureApp) {
  const url = fixture.url.replace(/^http/, "ws");
  const socket = new WebSocket(`${url}/ws`);

  try {
    const message = await new Promise<string>((resolve, reject) => {
      socket.addEventListener("open", () => socket.send("hello"), { once: true });
      socket.addEventListener("message", (event) => resolve(String(event.data)), { once: true });
      socket.addEventListener("error", reject, { once: true });
    });

    expect(message).toBe("echo:hello");
  } finally {
    socket.close();
  }
}

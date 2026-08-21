import { afterEach, describe, expect, test } from "vite-plus/test";

import type { RuntimeName } from "../../helpers/launchers";

import { type FixtureApp, ProductionFixture } from "../../helpers/fixture";
import { requireCommand } from "../../helpers/runtime";

export function registerWebSocketTests(
  runtime: Extract<RuntimeName, "bun" | "deno" | "cloudflare">,
) {
  const websocketServer = `import { createHonoServer } from "react-router-hono-server/${runtime}";

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

  describe(`${runtime} WebSockets`, () => {
    test(
      "echoes messages in development",
      { retry: 1, timeout: 180_000 },
      async () => {
        requireRuntimeCommand(runtime);
        app = await ProductionFixture.create("basic", runtime);
        await app.edit("app/server.ts", websocketServer);
        await app.startDev();

        await expectWebSocketEcho(app);
      },
    );

    test("echoes messages in production", async () => {
      requireRuntimeCommand(runtime);
      app = await ProductionFixture.create("basic", runtime);
      await app.edit("app/server.ts", websocketServer);
      await app.build();
      await app.startProduction();

      await expectWebSocketEcho(app);
    }, 180_000);
  });
}

function requireRuntimeCommand(runtime: "bun" | "deno" | "cloudflare") {
  if (runtime === "bun" || runtime === "deno") {
    requireCommand(runtime);
  }
}

async function expectWebSocketEcho(fixture: FixtureApp) {
  const url = fixture.url.replace(/^http/, "ws");
  const socket = new WebSocket(`${url}/ws`);

  try {
    const message = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timed out waiting for a WebSocket message.\n\n${fixture.logs()}`));
      }, 10_000);
      socket.addEventListener("open", () => socket.send("hello"), { once: true });
      socket.addEventListener(
        "message",
        (event) => {
          clearTimeout(timeout);
          resolve(String(event.data));
        },
        { once: true },
      );
      socket.addEventListener(
        "error",
        () => {
          clearTimeout(timeout);
          reject(new Error(`WebSocket connection failed.\n\n${fixture.logs()}`));
        },
        { once: true },
      );
    });

    expect(message).toBe("echo:hello");
  } finally {
    socket.close();
  }
}

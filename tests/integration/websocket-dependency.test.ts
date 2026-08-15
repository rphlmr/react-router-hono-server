import { Hono } from "hono";
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("ws");
  vi.resetModules();
  vi.unstubAllEnvs();
});

test("reports how to install the optional WebSocket dependency", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.doMock("ws", () => {
    throw new Error('Cannot find package "ws"');
  });

  const { createWebSocket } = await import("../../src/helpers");

  await expect(createWebSocket({ app: new Hono(), enabled: true })).rejects.toMatchObject({
    message:
      'WebSocket support through @hono/node-server requires the optional "ws" peer dependency. Install "ws" before enabling useWebSocket.',
    cause: expect.any(Error),
  });
});

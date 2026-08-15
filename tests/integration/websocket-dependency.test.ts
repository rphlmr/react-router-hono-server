import { Hono } from "hono";
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("hono/bun");
  vi.doUnmock("hono/deno");
  vi.doUnmock("ws");
  vi.resetModules();
  vi.unstubAllEnvs();
});

test.each([
  ["node", "production"],
  ["bun", "development"],
  ["deno", "development"],
] as const)("reports how to install ws for %s in %s", async (runtime, mode) => {
  vi.stubEnv("REACT_ROUTER_HONO_SERVER_RUNTIME", runtime);
  vi.stubEnv("NODE_ENV", mode);
  vi.doMock("ws", () => {
    throw new Error('Cannot find package "ws"');
  });

  const { createWebSocket } = await import("../../src/helpers");

  await expect(createWebSocket({ app: new Hono(), enabled: true })).rejects.toMatchObject({
    message: `WebSocket support for the "${runtime}" runtime in ${mode} requires the optional "ws" peer dependency. Install "ws" before enabling useWebSocket.`,
    cause: expect.any(Error),
  });
});

test.each([
  ["bun", "production"],
  ["deno", "production"],
  ["cloudflare", "development"],
  ["cloudflare", "production"],
] as const)("does not load ws for %s in %s", async (runtime, mode) => {
  vi.stubEnv("REACT_ROUTER_HONO_SERVER_RUNTIME", runtime);
  vi.stubEnv("NODE_ENV", mode);
  vi.doMock("ws", () => {
    throw new Error("ws must not be imported");
  });
  if (runtime === "bun") {
    vi.doMock("hono/bun", () => ({
      createBunWebSocket: () => ({ upgradeWebSocket: () => {}, websocket: {} }),
    }));
  }
  if (runtime === "deno") {
    vi.doMock("hono/deno", () => ({ upgradeWebSocket: () => {} }));
  }

  const { createWebSocket } = await import("../../src/helpers");

  await expect(createWebSocket({ app: new Hono(), enabled: true })).resolves.toEqual({
    upgradeWebSocket: expect.any(Function),
    injectWebSocket: expect.any(Function),
  });
});

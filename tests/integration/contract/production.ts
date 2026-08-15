import { expect, test } from "vitest";
import type { FixtureApp } from "../../helpers/fixture";
import { prefixBefore } from "../../helpers/stream";
import { registerProductionBrowserTests } from "./browser";

export function registerProductionTests(getApp: () => FixtureApp) {
  registerProductionBrowserTests(getApp);
  test("builds a React Router application", () => {
    expect(getApp().buildResult?.exitCode).toBe(0);
  });

  test("serves SSR HTML", async () => {
    const response = await getApp().fetch("/");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("SSR works");
  });

  test("runs a loader through the production server", async () => {
    const response = await getApp().fetch("/loader");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("hello-from-loader");
  });

  test("runs an action through the production server", async () => {
    const response = await getApp().fetch("/action", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        value: "hello-from-action",
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("hello-from-action");
  });

  test("streams deferred loader data", async () => {
    await assertDeferredStreaming(getApp());
  });

  test("forwards Hono context into React Router loaders", async () => {
    const response = await getApp().fetch("/context");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("from-hono");
  });

  test("preserves React Router redirects", async () => {
    const app = getApp();
    const response = await app.fetch("/redirect", { redirect: "manual" });
    const location = response.headers.get("location");

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(location === "/" || location === `${app.url}/`).toBe(true);
    expect(response.headers.get("x-test-redirect")).toBe("yes");
  });

  test("preserves non-200 loader responses", async () => {
    const response = await getApp().fetch("/error");

    expect(response.status).toBe(418);
    expect(await response.text()).toContain("explicit-error");
  });

  test("serves public files with cache headers", async () => {
    const response = await getApp().fetch("/fixture.txt");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("public-fixture\n");
    expect(response.headers.get("cache-control")).toBe(
      getApp().runtime === "cloudflare" ? "public, max-age=0, must-revalidate" : "public, max-age=3600"
    );
  });

  test("serves React Router data requests", async () => {
    const response = await getApp().fetch("/loader.data");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("hello-from-loader");
  });
}

export async function assertDeferredStreaming(app: FixtureApp) {
  const response = await app.fetch("/deferred");

  expect(response.status).toBe(200);
  expect(response.body).not.toBeNull();

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response has no body");
  }

  const decoder = new TextDecoder();
  let text = "";
  let sawImmediateBeforeDeferred = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    text += decoder.decode(value, { stream: true });
    if ((text.includes("immediate-value") || text.includes("loading-deferred")) && !text.includes("deferred-value")) {
      sawImmediateBeforeDeferred = true;
    }
  }

  text += decoder.decode();

  expect(text).toContain("immediate-value");
  expect(text).toContain("deferred-value");
  expect(prefixBefore(text, "deferred-value")).toContain("immediate-value");
  expect(sawImmediateBeforeDeferred).toBe(true);
}

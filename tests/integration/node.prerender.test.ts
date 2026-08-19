import { afterAll, beforeAll, expect, test } from "vite-plus/test";

import type { PrerenderFixture } from "./contract/prerender";

import { preparePrerenderFixture, registerPrerenderBuildTests } from "./contract/prerender";

let fixture: PrerenderFixture;

beforeAll(async () => {
  fixture = await preparePrerenderFixture("node");
  await fixture.app.startProduction();
});

afterAll(async () => {
  await fixture?.app.stop();
});

registerPrerenderBuildTests(() => fixture);

test("serves callback documents statically and falls back to runtime SSR", async () => {
  const response = await fixture.app.fetch("/loader");
  const contentLength = response.headers.get("content-length");

  expect(response.status).toBe(200);
  expect(contentLength).toBe(
    String(Buffer.byteLength(fixture.withoutBasename.callback.loaderHtml)),
  );
  expect(await response.text()).toBe(fixture.withoutBasename.callback.loaderHtml);

  const rootResponse = await fixture.app.fetch("/");
  expect(rootResponse.status).toBe(200);
  expect(rootResponse.headers.get("content-length")).toBeNull();
  expect(await rootResponse.text()).toContain("SSR works");
});

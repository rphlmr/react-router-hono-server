import { afterAll, beforeAll, expect, test } from "vite-plus/test";

import type { PrerenderFixture } from "./contract/prerender";

import { requireCommand } from "../helpers/runtime";
import { preparePrerenderFixture, registerPrerenderBuildTests } from "./contract/prerender";

let fixture: PrerenderFixture;

beforeAll(async () => {
  requireCommand("bun");
  fixture = await preparePrerenderFixture("bun");
  await fixture.app.startProduction();
});

afterAll(async () => {
  await fixture?.app.stop();
});

registerPrerenderBuildTests(() => fixture);

test("serves callback documents statically and falls back to runtime SSR", async () => {
  const response = await fixture.app.fetch("/loader");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-length")).toBe(
    String(Buffer.byteLength(fixture.callback.loaderHtml)),
  );
  expect(await response.text()).toBe(fixture.callback.loaderHtml);

  const rootResponse = await fixture.app.fetch("/");
  expect(rootResponse.status).toBe(200);
  expect(await rootResponse.text()).toContain("SSR works");
});

import { afterAll, beforeAll, expect, test } from "vite-plus/test";

import type { PrerenderFixture } from "./contract/prerender";

import { requireCommand } from "../helpers/runtime";
import { preparePrerenderFixture, registerPrerenderBuildTests } from "./contract/prerender";

let fixture: PrerenderFixture;

beforeAll(async () => {
  requireCommand("deno");
  fixture = await preparePrerenderFixture("deno");
  await fixture.app.startProduction();
});

afterAll(async () => {
  await fixture?.app.stop();
});

registerPrerenderBuildTests(() => fixture);

test("serves callback documents statically and falls back to runtime SSR", async () => {
  const response = await fixture.app.fetch("/loader");
  expect(response.status).toBe(200);
  expect(await response.text()).toBe(fixture.withoutBasename.callback.loaderHtml);

  const rootResponse = await fixture.app.fetch("/");
  expect(rootResponse.status).toBe(200);
  expect(await rootResponse.text()).toContain("SSR works");
});

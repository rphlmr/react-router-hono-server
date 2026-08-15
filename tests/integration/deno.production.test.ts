import { afterAll, beforeAll, test } from "vitest";
import { type FixtureApp, ProductionFixture } from "../helpers/fixture";
import { hasCommand } from "../helpers/runtime";
import { registerProductionTests } from "./contract/production";

const denoAvailable = hasCommand("deno");

let app: FixtureApp;

beforeAll(async () => {
  if (!denoAvailable) {
    return;
  }
  app = await ProductionFixture.create("basic", "deno");
  await app.build();
  await app.startProduction();
});

afterAll(async () => {
  await app?.stop();
});

if (denoAvailable) {
  registerProductionTests(() => app);
} else {
  test.skip("deno is not installed", () => {});
}

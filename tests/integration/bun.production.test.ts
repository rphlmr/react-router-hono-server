import { afterAll, beforeAll, test } from "vitest";
import { type FixtureApp, ProductionFixture } from "../helpers/fixture";
import { hasCommand } from "../helpers/runtime";
import { registerProductionTests } from "./contract/production";

const bunAvailable = hasCommand("bun");

let app: FixtureApp;

beforeAll(async () => {
  if (!bunAvailable) {
    return;
  }
  app = await ProductionFixture.create("basic", "bun");
  await app.build();
  await app.startProduction();
});

afterAll(async () => {
  await app?.stop();
});

if (bunAvailable) {
  registerProductionTests(() => app);
} else {
  test.skip("bun is not installed", () => {});
}

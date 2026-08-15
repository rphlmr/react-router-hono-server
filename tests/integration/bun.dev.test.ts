import { afterAll, beforeAll, test } from "vitest";
import { DevServerFixture, type FixtureApp } from "../helpers/fixture";
import { hasCommand } from "../helpers/runtime";
import { registerDevServerTests } from "./contract/dev-server";

const bunAvailable = hasCommand("bun");

let app: FixtureApp;

beforeAll(async () => {
  if (!bunAvailable) {
    return;
  }
  app = await DevServerFixture.start("basic", "bun");
});

afterAll(async () => {
  await app?.stop();
});

if (bunAvailable) {
  registerDevServerTests(() => app);
} else {
  test.skip("bun is not installed", () => {});
}

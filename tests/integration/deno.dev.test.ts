import { afterAll, beforeAll, test } from "vitest";
import { DevServerFixture, type FixtureApp } from "../helpers/fixture";
import { hasCommand } from "../helpers/runtime";
import { registerDevServerTests } from "./contract/dev-server";

const denoAvailable = hasCommand("deno");

let app: FixtureApp;

beforeAll(async () => {
  if (!denoAvailable) {
    return;
  }
  app = await DevServerFixture.start("basic", "deno");
});

afterAll(async () => {
  await app?.stop();
});

if (denoAvailable) {
  registerDevServerTests(() => app);
} else {
  test.skip("deno is not installed", () => {});
}

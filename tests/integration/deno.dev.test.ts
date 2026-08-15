import { afterAll, beforeAll } from "vitest";
import { DevServerFixture, type FixtureApp } from "../helpers/fixture";
import { requireCommand } from "../helpers/runtime";
import { registerDevServerTests } from "./contract/dev-server";

let app: FixtureApp;

beforeAll(async () => {
  requireCommand("deno");
  app = await DevServerFixture.start("basic", "deno");
});

afterAll(async () => {
  await app?.stop();
});

registerDevServerTests(() => app);

import { afterAll, beforeAll } from "vite-plus/test";

import { DevServerFixture, type FixtureApp } from "../helpers/fixture";
import { requireCommand } from "../helpers/runtime";
import { registerDevServerTests } from "./contract/dev-server";

let app: FixtureApp;

beforeAll(async () => {
  requireCommand("bun");
  app = await DevServerFixture.start("basic", "bun");
});

afterAll(async () => {
  await app?.stop();
});

registerDevServerTests(() => app);

import { afterAll, beforeAll } from "vite-plus/test";

import { DevServerFixture, type FixtureApp } from "../helpers/fixture";
import { registerDevServerTests } from "./contract/dev-server";

let app: FixtureApp;

beforeAll(async () => {
  app = await DevServerFixture.start("basic", "node");
});

afterAll(async () => {
  await app?.stop();
});

registerDevServerTests(() => app);

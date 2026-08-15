import { afterAll, beforeAll } from "vitest";
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

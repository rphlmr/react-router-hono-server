import { afterAll, beforeAll } from "vitest";
import { type FixtureApp, ProductionFixture } from "../helpers/fixture";
import { requireCommand } from "../helpers/runtime";
import { registerProductionTests } from "./contract/production";

let app: FixtureApp;

beforeAll(async () => {
  requireCommand("bun");
  app = await ProductionFixture.create("basic", "bun");
  await app.build();
  await app.startProduction();
});

afterAll(async () => {
  await app?.stop();
});

registerProductionTests(() => app);

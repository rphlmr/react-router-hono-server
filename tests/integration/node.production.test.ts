import { afterAll, beforeAll } from "vitest";
import { type FixtureApp, ProductionFixture } from "../helpers/fixture";
import { registerProductionTests } from "./contract/production";

let app: FixtureApp;

beforeAll(async () => {
  app = await ProductionFixture.create("basic", "node");
  await app.build();
  await app.startProduction();
});

afterAll(async () => {
  await app?.stop();
});

registerProductionTests(() => app);

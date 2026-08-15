import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { type FixtureApp, ProductionFixture } from "../helpers/fixture";
import { fixtureBin, runCommand } from "../helpers/process";

let app: FixtureApp | undefined;

afterEach(async () => {
  await app?.stop();
  app = undefined;
});

test("installed CLI reveals a file and infers Node by default", async () => {
  app = await ProductionFixture.create("basic", "node");
  await rm(path.join(app.cwd, "app/server.ts"));
  await runCommand({
    command: fixtureBin(app.cwd, "react-router-hono-server"),
    args: ["reveal", "file"],
    cwd: app.cwd,
  });
  expect(await readFile(path.join(app.cwd, "app/server.ts"), "utf8")).toContain("react-router-hono-server/node");
});

test("installed CLI reveals a folder and infers an explicit runtime", async () => {
  app = await ProductionFixture.create("basic", "node");
  await app.edit(
    "vite.config.ts",
    'import { reactRouterHonoServer } from "react-router-hono-server/dev";\nreactRouterHonoServer({ runtime: "bun" });\n'
  );
  await runCommand({
    command: fixtureBin(app.cwd, "react-router-hono-server"),
    args: ["reveal", "folder"],
    cwd: app.cwd,
  });
  expect(await readFile(path.join(app.cwd, "app/server/index.ts"), "utf8")).toContain("react-router-hono-server/bun");
});

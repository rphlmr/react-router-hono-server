import { afterAll, beforeAll, expect, test } from "vitest";
import { ProductionFixture } from "../helpers/fixture";

let app: ProductionFixture;

beforeAll(async () => {
  app = await ProductionFixture.create("basic");
  await app.build();
  await app.start();
});

afterAll(async () => {
  await app?.stop();
});

test("builds a React Router application", () => {
  expect(app.buildResult?.exitCode).toBe(0);
});

test("serves SSR HTML", async () => {
  const response = await app.fetch("/");

  expect(response.status).toBe(200);
  expect(await response.text()).toContain("SSR works");
});

test("runs a loader through the production server", async () => {
  const response = await app.fetch("/loader");

  expect(response.status).toBe(200);
  expect(await response.text()).toContain("hello-from-loader");
});

test("runs an action through the production server", async () => {
  const response = await app.fetch("/action", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      value: "hello-from-action",
    }),
  });

  expect(response.status).toBe(200);
  expect(await response.text()).toContain("hello-from-action");
});

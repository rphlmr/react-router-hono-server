import { Hono } from "hono";
import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vite-plus/test";

import { getPath, reactRouterRedirect, redirect } from "../../src/http";
import { cache } from "../../src/middleware";

const artifactDirectory = path.resolve(import.meta.dirname, "../../out/test-artifacts");

describe("packed public surface", () => {
  test("contains every declared export, declaration, runtime file, and binary", async () => {
    const artifacts = (await readdir(artifactDirectory)).filter((file) => file.endsWith(".tgz"));
    expect(artifacts).toHaveLength(1);
    const entries = execFileSync("tar", ["-tzf", path.join(artifactDirectory, artifacts[0])], {
      encoding: "utf8",
    }).split("\n");

    for (const file of [
      "package/package.json",
      "package/dist/cli.js",
      "package/dist/dev.js",
      "package/dist/dev.d.ts",
      "package/dist/http.js",
      "package/dist/http.d.ts",
      "package/dist/middleware.js",
      "package/dist/middleware.d.ts",
      "package/dist/adapters/node.js",
      "package/dist/adapters/node.d.ts",
      "package/dist/adapters/bun.js",
      "package/dist/adapters/bun.d.ts",
      "package/dist/adapters/deno.js",
      "package/dist/adapters/deno.d.ts",
      "package/dist/adapters/cloudflare.js",
      "package/dist/adapters/cloudflare.d.ts",
      "package/dist/adapters/aws-lambda.js",
      "package/dist/adapters/aws-lambda.d.ts",
    ]) {
      expect(entries).toContain(file);
    }
  });
});

describe("utility exports", () => {
  test("cache sets headers only for successful file responses", async () => {
    const app = new Hono();
    app.use("*", cache(60));
    app.get("/asset.js", (c) => c.text("asset"));
    app.get("/route", (c) => c.text("route"));
    expect((await app.request("/asset.js")).headers.get("cache-control")).toBe(
      "public, max-age=60",
    );
    expect((await app.request("/route")).headers.get("cache-control")).toBeNull();
  });

  test("redirect and path helpers preserve React Router data semantics", async () => {
    const app = new Hono();
    app.get("*", (c) => {
      expect(getPath(c)).toBe("/account");
      return redirect(c, "/login");
    });
    const response = await app.request("/account.data");
    expect(response.status).toBe(202);
    expect(response.headers.get("location")).toBe("/login");
    expect(await response.text()).toContain("SingleFetchRedirect");
  });

  test("deprecated reactRouterRedirect remains available", () => {
    const response = reactRouterRedirect("/legacy");
    expect(response.status).toBe(202);
    expect(response.headers.get("location")).toBe("/legacy");
  });
});

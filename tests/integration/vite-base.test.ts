import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, test } from "vite-plus/test";

import type { FixtureName } from "../helpers/fixture";
import type { RuntimeName } from "../helpers/launchers";

import { ProductionFixture, type FixtureApp } from "../helpers/fixture";
import { assertProductionBrowserBehavior } from "./contract/browser";

const apps: FixtureApp[] = [];

afterAll(async () => {
  await Promise.all(apps.splice(0).map((app) => app.stop()));
});

async function startProduction(name: FixtureName, runtime: RuntimeName = "node") {
  const app = await ProductionFixture.create(name, runtime);
  apps.push(app);
  const build = await app.build();
  expect(build.exitCode, build.stderr || build.stdout).toBe(0);
  await app.startProduction();
  return app;
}

function generatedAssetUrls(html: string) {
  return [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => /(?:^|\/)assets\//.test(url));
}

async function expectLocalGeneratedAssets(app: FixtureApp, documentPath: string, prefix: string) {
  const response = await app.fetch(documentPath);
  expect(response.status).toBe(200);
  const html = await response.text();
  const assetUrls = generatedAssetUrls(html).filter((url) => url.startsWith(prefix));
  expect(assetUrls.some((url) => url.endsWith(".js"))).toBe(true);
  expect(assetUrls.some((url) => url.endsWith(".css"))).toBe(true);
  for (const url of assetUrls) {
    expect((await app.fetch(url)).status, url).toBe(200);
  }
  return html;
}

describe("Vite base and React Router basename ownership", () => {
  test("keeps root documents separate from a /v2/ Vite base in development", async () => {
    const app = await ProductionFixture.create("vite-base-root-documents", "node");
    apps.push(app);
    await app.startDev();

    const response = await app.fetch("/");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('"/v2/app/root.tsx"');
    expect((await app.fetch("/v2/@vite/client")).status).toBe(200);
    expect((await app.fetch("/api/health")).status).toBe(200);
    expect(app.logs()).not.toContain('No route matches URL "/v2/');
  });

  test("serves generated production assets under /v2/ while documents remain at root", async () => {
    const app = await startProduction("vite-base-root-documents");
    await expectLocalGeneratedAssets(app, "/", "/v2/assets/");
    expect((await app.fetch("/fixture.txt")).status).toBe(200);
    expect((await app.fetch("/v2/assets/missing.js")).status).toBe(404);
    await assertProductionBrowserBehavior(app);
  });

  test.each(["node", "bun", "deno"] as const)(
    "serves documents, data, and absolute-base assets on %s",
    async (runtime) => {
      const app = await startProduction("vite-base-same-prefix", runtime);
      await expectLocalGeneratedAssets(app, "/v2/", "/v2/assets/");
      expect((await app.fetch("/v2/loader.data")).status).toBe(200);
      expect((await app.fetch("/fixture.txt")).status).toBe(200);
      expect((await app.fetch("/v2/fixture.txt")).status).toBe(404);
      expect((await app.fetch("/v20/assets/missing.js")).status).toBe(404);
    },
  );

  test("does not conflate a shared Vite prefix with a nested document basename", async () => {
    const app = await startProduction("vite-base-nested-documents");
    await expectLocalGeneratedAssets(app, "/v2/app/", "/v2/assets/");
    expect((await app.fetch("/v2/app/loader.data")).status).toBe(200);
    expect((await app.fetch("/v2/loader")).status).toBe(404);
  });

  test("keeps Cloudflare asset-binding ownership with an absolute Vite base", async () => {
    const app = await startProduction("vite-base-same-prefix", "cloudflare");
    await expectLocalGeneratedAssets(app, "/v2/", "/v2/assets/");
  });

  test("keeps generated assets externally owned in AWS production", async () => {
    const app = await ProductionFixture.create("vite-base-same-prefix", "aws");
    apps.push(app);
    const buildResult = await app.build();
    expect(buildResult.exitCode, buildResult.stderr || buildResult.stdout).toBe(0);
    const build = await import(
      `${pathToFileURL(path.join(app.cwd, "build/server/index.js")).href}?test=${Date.now()}`
    );
    const handler = build.default as (
      event: ReturnType<typeof lambdaEvent>,
      context: ReturnType<typeof lambdaContext>,
      callback: () => void,
    ) => Promise<{ body: string; statusCode: number }>;

    const document = await handler(lambdaEvent("/v2/"), lambdaContext(), () => {});
    expect(document.statusCode).toBe(200);
    const [assetUrl] = generatedAssetUrls(document.body);
    expect(assetUrl).toMatch(/^\/v2\/assets\//);
    const asset = await handler(lambdaEvent(assetUrl), lambdaContext(), () => {});
    expect(asset.statusCode).toBe(404);
  });

  test.each([
    ["vite-base-full-url", "https://cdn.example.com/v2/assets/"],
    ["vite-base-relative-empty", "assets/"],
    ["vite-base-relative-dot", "./assets/"],
  ] as const)("preserves Vite-emitted URLs for %s", async (name, expectedPrefix) => {
    const app = await startProduction(name);
    const response = await app.fetch("/");
    expect(response.status).toBe(200);
    const urls = generatedAssetUrls(await response.text());
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.startsWith(expectedPrefix))).toBe(true);
  });
});

function lambdaEvent(rawPath: string) {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath,
    rawQueryString: "",
    headers: { host: "example.com", "user-agent": "integration-test" },
    requestContext: {
      accountId: "test",
      apiId: "test",
      domainName: "example.com",
      domainPrefix: "example",
      http: {
        method: "GET",
        path: rawPath,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "test",
      },
      requestId: "test",
      routeKey: "$default",
      stage: "$default",
      time: "",
      timeEpoch: 0,
    },
    isBase64Encoded: false,
  };
}

function lambdaContext() {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "test",
    functionVersion: "$LATEST",
    invokedFunctionArn: "test",
    memoryLimitInMB: "128",
    awsRequestId: "test",
    logGroupName: "test",
    logStreamName: "test",
    getRemainingTimeInMillis: () => 30_000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

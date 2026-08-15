import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { type FixtureApp, ProductionFixture } from "../helpers/fixture";

let app: FixtureApp;
type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };
type Handler = (
  lambdaEvent: ReturnType<typeof event>,
  lambdaContext: ReturnType<typeof context>,
  callback: () => void
) => Promise<LambdaResponse>;
let handler: Handler;

beforeAll(async () => {
  app = await ProductionFixture.create("basic", "aws");
  await app.build();
  const build = await import(`${pathToFileURL(path.join(app.cwd, "build/server/index.js")).href}?test=${Date.now()}`);
  handler = build.default as Handler;
});

afterAll(async () => {
  await app?.stop();
});

describe("AWS Lambda production handler", () => {
  test("exports a default handler", () => {
    expect(handler).toBeTypeOf("function");
  });

  test("translates status, headers, and body", async () => {
    const response = await handler(event("/api/health"), context(), () => {});
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(JSON.parse(response.body)).toEqual({ ok: true });
  });

  test("runs SSR and forwards Hono context", async () => {
    const response = await handler(event("/context"), context(), () => {});
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("from-hono");
  });
});

function event(rawPath: string) {
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
      http: { method: "GET", path: rawPath, protocol: "HTTP/1.1", sourceIp: "127.0.0.1", userAgent: "test" },
      requestId: "test",
      routeKey: "$default",
      stage: "$default",
      time: "",
      timeEpoch: 0,
    },
    isBase64Encoded: false,
  };
}

function context() {
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

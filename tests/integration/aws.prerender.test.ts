import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, expect, test } from "vitest";
import type { PrerenderFixture } from "./contract/prerender";
import { preparePrerenderFixture, registerPrerenderBuildTests } from "./contract/prerender";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };
type Handler = (
  event: ReturnType<typeof createEvent>,
  context: ReturnType<typeof createContext>,
  callback: () => void
) => Promise<LambdaResponse>;

let fixture: PrerenderFixture;
let handler: Handler;

beforeAll(async () => {
  fixture = await preparePrerenderFixture("aws");
  const build = await import(
    `${pathToFileURL(path.join(fixture.app.cwd, "build/server/index.js")).href}?test=${Date.now()}`
  );
  handler = build.default as Handler;
});

afterAll(async () => {
  await fixture?.app.stop();
});

registerPrerenderBuildTests(() => fixture);

test("keeps runtime SSR available for deployments that serve prerendered assets separately", async () => {
  const response = await handler(createEvent("/"), createContext(), () => {});
  expect(response.statusCode).toBe(200);
  expect(response.body).toContain("SSR works");
});

function createEvent(rawPath: string) {
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

function createContext() {
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

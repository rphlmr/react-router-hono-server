import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, expect, test } from "vite-plus/test";

import { type FixtureApp, ProductionFixture } from "../helpers/fixture";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };
type Handler = (
  event: ReturnType<typeof createEvent>,
  context: ReturnType<typeof createContext>,
  callback: () => void,
) => Promise<LambdaResponse>;

let app: FixtureApp;
let handler: Handler;

beforeAll(async () => {
  app = await ProductionFixture.create("basic", "aws");
  await app.edit(
    "react-router.config.ts",
    `import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  future: {
    unstable_enableNodeReadableStream: true,
  },
} satisfies Config;
`,
  );
  await app.build();
  const build = await import(
    `${pathToFileURL(path.join(app.cwd, "build/server/index.js")).href}?test=${Date.now()}`
  );
  handler = build.default as Handler;
});

afterAll(async () => {
  await app?.stop();
});

test("handles React Router's opt-in Node readable stream response", async () => {
  const response = await handler(createEvent("/context"), createContext(), () => {});

  expect(response.statusCode).toBe(200);
  expect(response.headers["content-type"]).toContain("text/html");
  expect(response.body).toContain("from-hono");
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

import type { LoaderFunctionArgs, ServerBuild } from "react-router";

import { Hono } from "hono";
import { createRequestHandler, redirect as reactRouterRedirect } from "react-router";
import { describe, expect, test, vi } from "vite-plus/test";

import { getPath, redirect } from "../../src/http";

const cases = [
  { path: "/", normalized: "/", status: 302 },
  { path: "/account", normalized: "/account", status: 302 },
  { path: "/account.data", normalized: "/account", status: 202 },
  { path: "/_.data", normalized: "/", status: 202 },
  { path: "/users/_.data", normalized: "/users/", status: 202 },
  { path: "/files/report.database", normalized: "/files/report.database", status: 302 },
  { path: "/exports/my.data-dump/x", normalized: "/exports/my.data-dump/x", status: 302 },
  { path: "/a.data/b.data", normalized: "/a.data/b", status: 202 },
  { path: "/a.data/b", normalized: "/a.data/b", status: 302 },
  { path: "/account.data/", normalized: "/account.data/", status: 302 },
  { path: "/account?file=report.data", normalized: "/account", status: 302 },
  { path: "/account.data?_routes=root", normalized: "/account", status: 202 },
  { path: "/users_.data", normalized: "/users_", status: 202 },
  { path: "/a.data/_.data", normalized: "/a.data/", status: 202 },
  { path: "/account.%64ata", normalized: "/account.data", status: 302 },
  { path: "/account%2Edata", normalized: "/account.data", status: 302 },
  { path: "/%5F.data", normalized: "/_", status: 202 },
  { path: "/users/%5F.data", normalized: "/users/_", status: 202 },
];

// Exercise the public React Router handler rather than copying its normalization logic.
async function requestReactRouter(path: string) {
  const loader = vi.fn((_args: LoaderFunctionArgs) => {
    return reactRouterRedirect("/login");
  });
  const build: ServerBuild = {
    entry: { module: { default: () => new Response("document") } },
    routes: { root: { id: "root", path: "*", module: { default: () => null, loader } } },
    assets: {
      entry: { imports: [], module: "/entry.js" },
      routes: {},
      url: "/manifest.js",
      version: "test",
    },
    publicPath: "/",
    assetsBuildDirectory: "build/client",
    future: {},
    ssr: true,
    isSpaMode: false,
    prerender: [],
    routeDiscovery: { mode: "initial", manifestPath: "/__manifest" },
  };
  const response = await createRequestHandler(
    build,
    "test",
  )(new Request(`http://localhost${path}`));
  const body = await response.text();
  expect(loader).toHaveBeenCalledTimes(1);

  return {
    // React Router preserves request.url in loaders; the splat exposes the matched path.
    pathname: `/${loader.mock.calls[0][0].params["*"] ?? ""}`,
    status: response.status,
    contentType: response.headers.get("content-type"),
    body,
  };
}

describe("React Router Single Fetch reference behavior", () => {
  test.each(cases)("normalizes and redirects $path", async ({ path, normalized, status }) => {
    const result = await requestReactRouter(path);

    expect(result.pathname).toBe(normalized);
    expect(result.status).toBe(status);
    if (status === 202) {
      expect(result.contentType).toBe("text/x-script");
      expect(result.body).toContain("SingleFetchRedirect");
    }
  });
});

describe("getPath compatibility with React Router", () => {
  test.each(cases)("normalizes $path like React Router route matching", async ({ path }) => {
    const reference = await requestReactRouter(path);
    const app = new Hono();
    app.get("*", (c) => c.text(getPath(c)));

    const response = await app.request(path);

    expect(await response.text()).toBe(reference.pathname);
  });
});

describe("redirect compatibility with React Router", () => {
  test.each(cases)("selects the same redirect protocol for $path", async ({ path }) => {
    const reference = await requestReactRouter(path);
    const app = new Hono();
    app.get("*", (c) => redirect(c, "/login"));

    const response = await app.request(path);
    const body = await response.text();

    expect(response.status).toBe(reference.status);
    expect(response.headers.get("location")).toBe("/login");
    if (reference.status === 202) {
      expect(response.headers.get("content-type")).toBe("text/x-script");
      expect(body).toContain("SingleFetchRedirect");
    }
  });
});

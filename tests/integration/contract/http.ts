import { expect, test } from "vite-plus/test";

import type { FixtureApp } from "../../helpers/fixture";

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

export function registerHttpHelperTests(getApp: () => FixtureApp) {
  test.each(cases)("getPath preserves the route path for $path", async ({ path, normalized }) => {
    const url = new URL(path, getApp().url);
    url.searchParams.set("__http_helper", "path");
    const response = await getApp().fetch(`${url.pathname}${url.search}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ path: normalized, requestUrl: url.href });
  });

  test.each(cases)("redirect selects the correct protocol for $path", async ({ path, status }) => {
    const app = getApp();
    const url = new URL(path, app.url);
    url.searchParams.set("__http_helper", "redirect");
    const response = await app.fetch(`${url.pathname}${url.search}`, { redirect: "manual" });
    const body = await response.text();

    expect(response.status).toBe(status);
    expect(["/login", `${app.url}/login`]).toContain(response.headers.get("location"));
    if (status === 202) {
      expect(response.headers.get("content-type")).toBe("text/x-script");
      expect(body).toContain("SingleFetchRedirect");
      expect(body).toContain("/login");
    } else {
      expect(response.headers.get("content-type")).not.toBe("text/x-script");
    }
  });
}

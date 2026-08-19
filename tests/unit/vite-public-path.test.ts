import { describe, expect, test, vi } from "vite-plus/test";

import {
  classifyVitePublicPath,
  composeViteAssetRewriteRequestPath,
  stripVitePathnamePrefix,
  viteGeneratedAssetsRoute,
} from "../../src/vite-public-path";

describe("Vite public path", () => {
  test.each([
    ["/", { kind: "root", raw: "/", pathname: "/" }],
    ["/v2", { kind: "absolute", raw: "/v2", pathname: "/v2/" }],
    ["/v2/", { kind: "absolute", raw: "/v2/", pathname: "/v2/" }],
    [
      "https://cdn.example.com/v2/",
      { kind: "url", raw: "https://cdn.example.com/v2/", pathname: "/v2/" },
    ],
    ["", { kind: "relative", raw: "", pathname: "/" }],
    ["./", { kind: "relative", raw: "./", pathname: "/" }],
  ] as const)("classifies %j", (raw, expected) => {
    expect(classifyVitePublicPath(raw)).toEqual(expected);
  });

  test.each([
    ["/", "/assets/*"],
    ["/v2", "/v2/assets/*"],
    ["https://cdn.example.com/v2/", "/assets/*"],
    ["", "/assets/*"],
    ["./", "/assets/*"],
  ])("maps generated assets for %j", (raw, expected) => {
    expect(viteGeneratedAssetsRoute(classifyVitePublicPath(raw), "assets")).toBe(expected);
  });

  test("strips only an exact absolute Vite path segment", () => {
    const publicPath = classifyVitePublicPath("/v2/");

    expect(stripVitePathnamePrefix("/v2/assets/app.js", publicPath)).toBe("/assets/app.js");
    expect(stripVitePathnamePrefix("/v20/assets/app.js", publicPath)).toBe("/v20/assets/app.js");
    expect(
      stripVitePathnamePrefix(
        "/v2/assets/app.js",
        classifyVitePublicPath("https://cdn.example.com/v2/"),
      ),
    ).toBe("/v2/assets/app.js");
  });

  test("runs the Node user rewrite after removing an absolute Vite prefix", () => {
    const context = { runtime: "node" };
    const userRewrite = vi.fn((requestPath: string, receivedContext: typeof context) => {
      expect(receivedContext).toBe(context);
      return `/rewritten${requestPath}`;
    });
    const rewrite = composeViteAssetRewriteRequestPath(classifyVitePublicPath("/v2/"), userRewrite);

    expect(rewrite("/v2/assets/app.js", context)).toBe("/rewritten/assets/app.js");
    expect(userRewrite).toHaveBeenCalledWith("/assets/app.js", context);
  });

  test.each(["bun", "deno"] as const)(
    "runs the %s user rewrite after removing an absolute Vite prefix",
    (runtime) => {
      const userRewrite = vi.fn((requestPath: string) => `/rewritten/${runtime}${requestPath}`);
      const rewrite = composeViteAssetRewriteRequestPath(
        classifyVitePublicPath("/v2/"),
        userRewrite,
      );

      expect(rewrite("/v2/assets/app.js")).toBe(`/rewritten/${runtime}/assets/app.js`);
      expect(userRewrite).toHaveBeenCalledWith("/assets/app.js");
    },
  );

  test("preserves root-base callback input and default rewrite behavior", () => {
    const userRewrite = vi.fn((requestPath: string) => `/rewritten${requestPath}`);
    const rewrite = composeViteAssetRewriteRequestPath(classifyVitePublicPath("/"), userRewrite);

    expect(rewrite("/assets/app.js")).toBe("/rewritten/assets/app.js");
    expect(userRewrite).toHaveBeenCalledWith("/assets/app.js");
    expect(composeViteAssetRewriteRequestPath(classifyVitePublicPath("/"))("/assets/app.js")).toBe(
      "/assets/app.js",
    );
  });
});

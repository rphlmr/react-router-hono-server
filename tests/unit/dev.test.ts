import type { Plugin, UserConfig } from "vite";

import fs from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  bunAdapter: vi.fn(),
  configureDevServer: vi.fn(),
  honoDevServer: vi.fn(),
  nodeAdapter: vi.fn(),
}));

vi.mock("@hono/vite-dev-server", () => ({ default: mocks.honoDevServer }));
vi.mock("@hono/vite-dev-server/bun", () => ({ default: mocks.bunAdapter }));
vi.mock("@hono/vite-dev-server/node", () => ({ default: mocks.nodeAdapter }));

import { reactRouterHonoServer } from "../../src/dev";

const VIRTUAL_MODULE_ID = "\0virtual:react-router-hono-server/server";
const REACT_ROUTER_BUILD_MODULE_ID = "\0virtual:react-router/server-build";
const temporaryDirectories: string[] = [];

type CallableHook = (...args: any[]) => any;

function callHook(plugin: Plugin, name: keyof Plugin, ...args: any[]) {
  const hook = plugin[name];
  if (typeof hook === "function") {
    return (hook as CallableHook).apply(plugin, args);
  }
  if (hook && typeof hook === "object" && "handler" in hook) {
    return (hook.handler as CallableHook).apply(plugin, args);
  }
  throw new Error(`Plugin hook ${String(name)} is not callable`);
}

function makeReactRouterConfig({
  appDirectory = "/project/app",
  assetsDir = "static",
  base,
  basename = "/base",
  buildDirectory = "/project/build",
  rootDirectory = "/project",
  serverBuildFile = "index.js",
}: {
  appDirectory?: string;
  assetsDir?: string;
  base?: string;
  basename?: string;
  buildDirectory?: string;
  rootDirectory?: string;
  serverBuildFile?: string;
} = {}): UserConfig {
  return {
    base,
    build: { assetsDir },
    __reactRouterPluginContext: {
      reactRouterConfig: {
        appDirectory,
        basename,
        buildDirectory,
        serverBuildFile,
      },
      environmentBuildContext: null,
      rootDirectory,
      entryClientFilePath: path.join(appDirectory, "entry.client.tsx"),
      entryServerFilePath: path.join(appDirectory, "entry.server.tsx"),
    },
  } as UserConfig;
}

function resolvePluginConfig(
  plugin: Plugin,
  config: UserConfig = makeReactRouterConfig(),
  mode = "development",
) {
  return callHook(plugin, "config", config, { command: "serve", mode }) as any;
}

function makeServer() {
  return {
    middlewares: {
      use: vi.fn(),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.honoDevServer.mockReturnValue({ configureServer: mocks.configureDevServer });
});

afterEach(async () => {
  vi.restoreAllMocks();
  delete process.env.IS_RR_BUILD_REQUEST;
  delete globalThis.__viteDevServer;
  delete (globalThis as any).__rrhsPreviewLoads;
  delete (globalThis as any).__rrhsPreviewRequest;
  for (const directory of temporaryDirectories.splice(0)) {
    await rm(directory, { force: true, recursive: true });
  }
});

describe("reactRouterHonoServer virtual module", () => {
  test("exposes stable Vite plugin metadata and ignores unrelated module ids", () => {
    const plugin = reactRouterHonoServer();

    expect(plugin.name).toBe("react-router-hono-server");
    expect(plugin.enforce).toBe("post");
    expect(callHook(plugin, "resolveId", "other-module")).toBeUndefined();
    expect(callHook(plugin, "load", "other-module")).toBeUndefined();
  });

  test.each([
    [undefined, "node"],
    ["node", "node"],
    ["bun", "bun"],
    ["deno", "deno"],
    ["cloudflare", "cloudflare"],
    ["aws", "aws-lambda"],
  ] as const)(
    "generates the %s runtime fallback from the public %s adapter",
    (runtime, adapter) => {
      const plugin = reactRouterHonoServer(runtime ? { runtime } : undefined);

      expect(callHook(plugin, "resolveId", VIRTUAL_MODULE_ID)).toBe(VIRTUAL_MODULE_ID);
      expect(callHook(plugin, "load", VIRTUAL_MODULE_ID)).toContain(
        `from "react-router-hono-server/${adapter}"`,
      );
      expect(callHook(plugin, "load", VIRTUAL_MODULE_ID)).toContain(
        "export default await createHonoServer()",
      );
    },
  );
});

describe("reactRouterHonoServer config hook", () => {
  test("does nothing outside a React Router Vite configuration", () => {
    const plugin = reactRouterHonoServer();

    expect(
      callHook(plugin, "config", {}, { command: "serve", mode: "development" }),
    ).toBeUndefined();
  });

  test("defines the React Router environment and custom project paths", () => {
    const plugin = reactRouterHonoServer({ serverEntryPoint: "src/custom-server.ts" });
    const result = resolvePluginConfig(
      plugin,
      makeReactRouterConfig({
        appDirectory: "/workspace/src/web",
        assetsDir: "bundled-assets",
        base: "/vite/",
        basename: "/admin",
        buildDirectory: "/workspace/output",
        rootDirectory: "/workspace",
      }),
    );

    expect(result.define).toEqual({
      "import.meta.env.REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY": '"output"',
      "import.meta.env.REACT_ROUTER_HONO_SERVER_ASSETS_DIR": '"bundled-assets"',
      "import.meta.env.REACT_ROUTER_HONO_SERVER_RUNTIME": '"node"',
      "import.meta.env.REACT_ROUTER_HONO_SERVER_BASENAME": '"/admin"',
      "import.meta.env.REACT_ROUTER_HONO_SERVER_VITE_BASE": '"/vite/"',
    });
    expect(result.ssr).toMatchObject({ external: [], noExternal: ["react-router-hono-server"] });
    expect(result.environments.ssr.build.rollupOptions.input).toBe("src/custom-server.ts");
  });

  test.each([
    {
      runtime: "node",
      mode: "development",
      alias: undefined,
      external: [],
      optimizeDeps: undefined,
      target: undefined,
    },
    {
      runtime: "aws",
      mode: "production",
      alias: undefined,
      external: [],
      optimizeDeps: undefined,
      target: undefined,
    },
    {
      runtime: "bun",
      mode: "development",
      alias: { "react-dom/server": "react-dom/server.browser" },
      external: [],
      optimizeDeps: { exclude: ["react"], include: ["react-dom/server"] },
      target: undefined,
    },
    {
      runtime: "cloudflare",
      mode: "development",
      alias: { "react-dom/server": "react-dom/server.edge" },
      external: undefined,
      optimizeDeps: undefined,
      target: "webworker",
    },
    {
      runtime: "deno",
      mode: "development",
      alias: undefined,
      external: ["react", "react-dom"],
      optimizeDeps: undefined,
      target: undefined,
    },
    {
      runtime: "deno",
      mode: "production",
      alias: { "react-dom/server": "react-dom/server.browser" },
      external: [],
      optimizeDeps: undefined,
      target: undefined,
    },
  ] as const)(
    "returns the $runtime configuration in $mode mode",
    ({ runtime, mode, ...expected }) => {
      const plugin = reactRouterHonoServer({ runtime, serverEntryPoint: "app/server.ts" });
      const result = resolvePluginConfig(plugin, makeReactRouterConfig(), mode);

      expect(result.resolve.alias).toEqual(expected.alias);
      expect(result.ssr.external).toEqual(expected.external);
      expect(result.ssr.optimizeDeps).toEqual(expected.optimizeDeps);
      expect(result.ssr.target).toBe(expected.target);
      expect(result.environments.ssr.resolve.alias).toEqual(expected.alias);
      expect(result.environments.ssr.resolve.external).toEqual(
        runtime === "deno" && mode === "development" ? ["react", "react-dom"] : undefined,
      );
      expect(result.environments.ssr.build.rollupOptions.input).toBe(
        runtime === "cloudflare" ? undefined : "app/server.ts",
      );
      expect(result.environments.ssr.build.rollupOptions.output.manualChunks).toEqual(
        runtime === "cloudflare" ? undefined : expect.any(Function),
      );
    },
  );

  test("preserves React Router manifest and chunk naming requirements", () => {
    const plugin = reactRouterHonoServer({ serverEntryPoint: "app/server.ts" });
    const result = resolvePluginConfig(plugin);
    const output = result.environments.ssr.build.rollupOptions.output;
    const entryChunk = { facadeModuleId: "app/server.ts" };

    expect(output.entryFileNames(entryChunk)).toBe("index.js");
    expect(entryChunk.facadeModuleId).toBe(REACT_ROUTER_BUILD_MODULE_ID);
    expect(output.chunkFileNames({ name: "server-build" })).toBe("assets/server-build.js");
    expect(output.chunkFileNames({ name: "route" })).toBe("assets/[name]-[hash].js");
    expect(
      output.manualChunks("/project/app/session.ts", {
        getModuleInfo: () => ({ importers: ["/project/app/server.ts"] }),
      }),
    ).toBe("session");
    expect(
      output.manualChunks("/project/app/session.ts", {
        getModuleInfo: () => ({ importers: ["/project/app/route.ts"] }),
      }),
    ).toBeUndefined();
  });

  test("uses a custom React Router server build filename", () => {
    const plugin = reactRouterHonoServer({ serverEntryPoint: "app/server.ts" });
    const result = resolvePluginConfig(
      plugin,
      makeReactRouterConfig({ serverBuildFile: "chunks/router.js" }),
    );

    expect(
      result.environments.ssr.build.rollupOptions.output.chunkFileNames({ name: "server-build" }),
    ).toBe("chunks/router.js");
  });

  test("discovers a file entry before a folder entry and otherwise warns once before using the virtual module", () => {
    const exists = vi.spyOn(fs, "existsSync");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    exists.mockImplementation((candidate) => String(candidate) === "app/server.ts");
    let result = resolvePluginConfig(reactRouterHonoServer());
    expect(result.environments.ssr.build.rollupOptions.input).toBe("app/server.ts");

    exists.mockImplementation((candidate) => String(candidate) === "app/server/index.ts");
    result = resolvePluginConfig(reactRouterHonoServer());
    expect(result.environments.ssr.build.rollupOptions.input).toBe("app/server/index.ts");

    exists.mockReturnValue(false);
    result = resolvePluginConfig(reactRouterHonoServer());
    expect(result.environments.ssr.build.rollupOptions.input).toBe(VIRTUAL_MODULE_ID);
    resolvePluginConfig(reactRouterHonoServer());
    expect(warning).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("No server entry point found"));
  });
});

describe("reactRouterHonoServer configResolved hook", () => {
  test.each(["vite-plugin-cloudflare", "vite-plugin-cloudflare:ssr"])(
    "accepts the Cloudflare plugin named %s",
    (name) => {
      const plugin = reactRouterHonoServer({ runtime: "cloudflare" });

      expect(() => callHook(plugin, "configResolved", { plugins: [{ name }] })).not.toThrow();
    },
  );

  test("rejects a Cloudflare configuration without the official plugin", () => {
    const plugin = reactRouterHonoServer({ runtime: "cloudflare" });

    expect(() =>
      callHook(plugin, "configResolved", { plugins: [{ name: "react-router" }] }),
    ).toThrow("Missing cloudflare() in vite.config.ts");
  });

  test("does not require the Cloudflare plugin for other runtimes", () => {
    const plugin = reactRouterHonoServer({ runtime: "node" });

    expect(() => callHook(plugin, "configResolved", { plugins: [] })).not.toThrow();
  });
});

describe("reactRouterHonoServer configureServer hook", () => {
  test("configures Hono once with socket metadata and behavioral exclusion rules", () => {
    const customExclude = /^\/healthcheck$/;
    const plugin = reactRouterHonoServer({
      dev: { exclude: [customExclude], export: "development" },
      serverEntryPoint: "src/web/server.ts",
    });
    resolvePluginConfig(
      plugin,
      makeReactRouterConfig({ appDirectory: "/project/src/web", rootDirectory: "/project" }),
    );
    const server = makeServer();

    callHook(plugin, "configureServer", server);
    callHook(plugin, "configureServer", server);

    expect(mocks.honoDevServer).toHaveBeenCalledOnce();
    expect(mocks.configureDevServer).toHaveBeenCalledOnce();
    expect(mocks.configureDevServer).toHaveBeenCalledWith(server);
    const options = mocks.honoDevServer.mock.calls[0][0];
    expect(options).toMatchObject({
      adapter: mocks.nodeAdapter,
      entry: "src/web/server.ts",
      export: "development",
      injectClientScript: false,
    });
    expect(options).not.toHaveProperty("base");

    const [appAssetPattern, sourceAssetPattern] = options.exclude as [RegExp, RegExp];
    expect(appAssetPattern.test("/src/web/styles.css")).toBe(true);
    expect(appAssetPattern.test("/src/web/route.data")).toBe(false);
    expect(appAssetPattern.test("/src/web/route.data?index")).toBe(false);
    expect(sourceAssetPattern.test("/src/shared/image.png?raw")).toBe(true);
    expect(sourceAssetPattern.test("/src/shared/route.data?index")).toBe(false);
    expect(options.exclude).toEqual(
      expect.arrayContaining([/\?import(\?.*)?$/, /^\/@.+$/, /^\/node_modules\/.*/, customExclude]),
    );
    expect(options.exclude).toContain("^(?=/src/web/**/.*/**)");
    expect(options.exclude).toContain("^(?=/src/**/.*/**)");

    const socketMiddleware = server.middlewares.use.mock.calls[0][0];
    const request = {
      rawHeaders: [] as string[],
      socket: { remoteAddress: "127.0.0.1", remoteFamily: "IPv4", remotePort: 4321 },
    };
    const next = vi.fn();
    socketMiddleware(request, {}, next);
    expect(request.rawHeaders).toEqual([
      "x-remote-address",
      "127.0.0.1",
      "x-remote-port",
      "4321",
      "x-remote-family",
      "IPv4",
    ]);
    expect(next).toHaveBeenCalledOnce();
  });

  test.each(["/v2/", "https://cdn.example.com/v2/"])(
    "prefixes only Vite-owned development exclusions with the Vite pathname from %s",
    (base) => {
      const customExclude = /^\/custom\.txt$/;
      const plugin = reactRouterHonoServer({
        dev: { exclude: [customExclude] },
        serverEntryPoint: "app/server.ts",
      });
      resolvePluginConfig(plugin, makeReactRouterConfig({ appDirectory: "/project/app", base }));

      callHook(plugin, "configureServer", makeServer());

      const options = mocks.honoDevServer.mock.calls[0][0];
      const excludes = options.exclude as Array<RegExp | string>;
      const matches = (url: string) =>
        excludes.some((exclude) => exclude instanceof RegExp && exclude.test(url));

      expect(matches("/v2/app/root.tsx")).toBe(true);
      expect(matches("/v2/@vite/client")).toBe(true);
      expect(matches("/v2/node_modules/react/index.js")).toBe(true);
      expect(matches("/v2/dashboard")).toBe(false);
      expect(matches("/v2/custom-hono")).toBe(false);
      expect(matches("/v2/app/root.data?index")).toBe(false);
      expect(customExclude.test("/custom.txt")).toBe(true);
      expect(customExclude.test("/v2/custom.txt")).toBe(false);
      expect(options).not.toHaveProperty("base");
    },
  );

  test("uses unknown socket metadata fallbacks", () => {
    const plugin = reactRouterHonoServer({ serverEntryPoint: "app/server.ts" });
    resolvePluginConfig(plugin);
    const server = makeServer();
    callHook(plugin, "configureServer", server);
    const socketMiddleware = server.middlewares.use.mock.calls[0][0];
    const request = { rawHeaders: [] as string[], socket: {} };

    socketMiddleware(request, {}, vi.fn());

    expect(request.rawHeaders).toEqual([
      "x-remote-address",
      "unknown",
      "x-remote-port",
      "unknown",
      "x-remote-family",
      "unknown",
    ]);
  });

  test("selects the Bun adapter", () => {
    const plugin = reactRouterHonoServer({ runtime: "bun", serverEntryPoint: "app/server.ts" });
    resolvePluginConfig(plugin);

    callHook(plugin, "configureServer", makeServer());

    expect(mocks.honoDevServer).toHaveBeenCalledWith(
      expect.objectContaining({ adapter: mocks.bunAdapter }),
    );
  });

  test("creates a Deno adapter that exposes Deno environment variables", () => {
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const denoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Deno");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: undefined,
      writable: true,
    });
    Object.defineProperty(globalThis, "Deno", {
      configurable: true,
      value: { env: { toObject: vi.fn(() => ({ TOKEN: "secret" })) } },
      writable: true,
    });

    try {
      const plugin = reactRouterHonoServer({ runtime: "deno", serverEntryPoint: "app/server.ts" });
      resolvePluginConfig(plugin);
      callHook(plugin, "configureServer", makeServer());
      const adapter = mocks.honoDevServer.mock.calls[0][0].adapter;

      expect(adapter()).toEqual({ env: { TOKEN: "secret" } });
      expect(adapter()).toEqual({ env: { TOKEN: "secret" } });
      expect(globalThis.navigator.userAgent).toBe("Deno");
    } finally {
      if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
      else Reflect.deleteProperty(globalThis, "navigator");
      if (denoDescriptor) Object.defineProperty(globalThis, "Deno", denoDescriptor);
      else Reflect.deleteProperty(globalThis, "Deno");
    }
  });

  test("binds the Vite server but skips Hono without React Router context or on Cloudflare", () => {
    const plainPlugin = reactRouterHonoServer();
    const plainServer = makeServer();
    callHook(plainPlugin, "configureServer", plainServer);
    expect(globalThis.__viteDevServer).toBe(plainServer);

    const cloudflarePlugin = reactRouterHonoServer({
      runtime: "cloudflare",
      serverEntryPoint: "app/server.ts",
    });
    resolvePluginConfig(cloudflarePlugin);
    const cloudflareServer = makeServer();
    callHook(cloudflarePlugin, "configureServer", cloudflareServer);
    expect(globalThis.__viteDevServer).toBe(cloudflareServer);
    expect(mocks.honoDevServer).not.toHaveBeenCalled();
  });

  test("reports a delegated dev plugin without a configureServer hook", () => {
    mocks.honoDevServer.mockReturnValue({});
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const plugin = reactRouterHonoServer({ serverEntryPoint: "app/server.ts" });
    resolvePluginConfig(plugin);

    expect(() => callHook(plugin, "configureServer", makeServer())).toThrow(
      "Cannot apply dev server plugin configureServer hook",
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("configureServer hook is not a function"),
    );
  });
});

describe("reactRouterHonoServer configurePreviewServer hook", () => {
  test("forwards React Router build requests and caches the built application import", async () => {
    const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "rrhs-preview-"));
    temporaryDirectories.push(rootDirectory);
    const serverDirectory = path.join(rootDirectory, "build/server");
    await mkdir(serverDirectory, { recursive: true });
    await writeFile(
      path.join(serverDirectory, "index.js"),
      `
        globalThis.__rrhsPreviewLoads = (globalThis.__rrhsPreviewLoads || 0) + 1;
        export default {
          async fetch(request) {
            globalThis.__rrhsPreviewRequest = {
              header: request.headers.get("x-test"),
              method: request.method,
              url: request.url,
            };
            return new Response(new Uint8Array([0, 255, 42]), {
              status: 201,
              headers: { "content-type": "application/octet-stream", "x-preview": "yes" },
            });
          },
        };
      `,
    );
    const plugin = reactRouterHonoServer({ serverEntryPoint: "app/server.ts" });
    resolvePluginConfig(
      plugin,
      makeReactRouterConfig({
        appDirectory: path.join(rootDirectory, "app"),
        buildDirectory: path.join(rootDirectory, "build"),
        rootDirectory,
      }),
    );
    const server = makeServer();
    callHook(plugin, "configurePreviewServer", server);
    const middleware = server.middlewares.use.mock.calls[0][0];
    process.env.IS_RR_BUILD_REQUEST = "yes";
    const request = {
      headers: { host: "preview.test", "x-test": ["one", "two"], omitted: undefined },
      method: "GET",
      url: "/route?index",
    };
    let resolveResponses: () => void = () => undefined;
    const responsesComplete = new Promise<void>((resolve) => {
      resolveResponses = resolve;
    });
    let responseEndCount = 0;
    const end = vi.fn(() => {
      responseEndCount += 1;
      if (responseEndCount === 2) resolveResponses();
    });
    const response = { end, setHeader: vi.fn(), statusCode: 0 };

    middleware(request, response, vi.fn());
    middleware(request, response, vi.fn());
    await responsesComplete;

    expect((globalThis as any).__rrhsPreviewLoads).toBe(1);
    expect((globalThis as any).__rrhsPreviewRequest).toEqual({
      header: "one, two",
      method: "GET",
      url: "http://preview.test/route?index",
    });
    expect(response.statusCode).toBe(201);
    expect(response.setHeader).toHaveBeenCalledWith("content-type", "application/octet-stream");
    expect(response.setHeader).toHaveBeenCalledWith("x-preview", "yes");
    expect(response.end).toHaveBeenCalledWith(Buffer.from([0, 255, 42]));
  });

  test("bypasses ordinary preview requests, missing plugin context, and Cloudflare", () => {
    const cases = [
      reactRouterHonoServer({ serverEntryPoint: "app/server.ts" }),
      reactRouterHonoServer(),
      reactRouterHonoServer({ runtime: "cloudflare", serverEntryPoint: "app/server.ts" }),
    ];
    resolvePluginConfig(cases[0]);
    resolvePluginConfig(cases[2]);

    for (const plugin of cases) {
      const server = makeServer();
      callHook(plugin, "configurePreviewServer", server);
      const next = vi.fn();
      server.middlewares.use.mock.calls[0][0]({ headers: {}, method: "GET", url: "/" }, {}, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  test("logs preview import failures and forwards them to Vite", async () => {
    const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "rrhs-preview-error-"));
    temporaryDirectories.push(rootDirectory);
    const plugin = reactRouterHonoServer({ serverEntryPoint: "app/server.ts" });
    resolvePluginConfig(
      plugin,
      makeReactRouterConfig({
        appDirectory: path.join(rootDirectory, "app"),
        buildDirectory: path.join(rootDirectory, "missing-build"),
        rootDirectory,
      }),
    );
    const server = makeServer();
    callHook(plugin, "configurePreviewServer", server);
    process.env.IS_RR_BUILD_REQUEST = "yes";
    let resolveNextError: () => void = () => undefined;
    const nextError = new Promise<void>((resolve) => {
      resolveNextError = resolve;
    });
    const next = vi.fn((receivedError: unknown) => {
      if (receivedError instanceof Error) resolveNextError();
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    server.middlewares.use.mock.calls[0][0]({ headers: {}, method: "GET", url: "/" }, {}, next);
    await nextError;

    expect(error).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

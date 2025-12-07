import { beforeEach, describe, it, vi } from "vitest";
import { serverBuildStub } from "./server-build.stub";

const importBuildMock = vi.fn().mockResolvedValue(serverBuildStub);

vi.mock("../src/helpers", async () => {
  const actual = await vi.importActual<typeof import("../src/helpers")>("../src/helpers");

  return {
    ...actual,
    importBuild: importBuildMock,
    getBuildMode: vi.fn(() => "development"),
    bindIncomingRequestSocketInfo: () => {
      const middleware = actual.bindIncomingRequestSocketInfo();

      return (c: any, next: any) => {
        if (!c.env) {
          c.env = {};
        }

        return middleware(c, next);
      };
    },
  };
});

const testEnv = {
  REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY: "tests/fixtures/minimal-app/build",
  REACT_ROUTER_HONO_SERVER_ASSETS_DIR: "assets",
  REACT_ROUTER_HONO_SERVER_RUNTIME: "node",
  REACT_ROUTER_HONO_SERVER_BASENAME: "/",
} as const;

describe("createHonoServer", () => {
  beforeEach(() => {
    const meta = import.meta as Record<string, any>;
    meta.env ??= {};
    Object.assign(meta.env, testEnv);
    vi.clearAllMocks();
  });

  it("responds with loader data", async () => {
    const { createHonoServer } = await import("../src/adapters/node");

    const app = await createHonoServer({ defaultLogger: false });

    const rootResponse = await app.request("http://127.0.0.1/_root.data");
    const rootJson = await rootResponse.json();
    expect(rootResponse.status).toBe(200);
    expect(rootJson).toEqual([{ _1: 2 }, "root", { _3: 4 }, "data", { _5: 1 }, "id"]);

    const firstResponse = await app.request("http://127.0.0.1/first.data");
    const firstJson = await firstResponse.json();
    expect(firstResponse.status).toBe(200);
    expect(firstJson).toEqual([
      { _1: 2, _6: 7 },
      "root",
      { _3: 4 },
      "data",
      { _5: 1 },
      "id",
      "routes/first",
      { _3: 8 },
      { _5: 9 },
      "first",
    ]);

    const apiResponse = await app.request("http://127.0.0.1/resources/api");
    const apiJson = await apiResponse.json();
    expect(apiResponse.status).toBe(200);
    expect(apiJson).toEqual({ id: "resources/api" });
  });

  it("responds with loader data deferred", async () => {
    const { createHonoServer } = await import("../src/adapters/node");

    const app = await createHonoServer({ defaultLogger: false });

    const response = await app.request("http://127.0.0.1/defer.data");
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(ReadableStream);
    expect(response.body?.locked).toBe(false);

    const text = await response.text();
    expect(text.trim()).toBe(
      `[{"_1":2,"_6":7},"root",{"_3":4},"data",{"_5":1},"id","routes/defer",{"_3":8},{"_5":9},["P",9]]\nP9:["defer"]`
    );
  });

  it("catch unexpected errors with entry.server handleErrors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const { createHonoServer } = await import("../src/adapters/node");

      const app = await createHonoServer({ defaultLogger: false });

      const errorResponse = await app.request("http://127.0.0.1/error.data");
      const errorJson = await errorResponse.json();
      expect(errorResponse.status).toBe(500);
      expect(errorJson).toContain("Test error from loader");

      expect(consoleErrorSpy).toHaveBeenCalledWith("handleError", new Error("Test error from loader"));
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("catch unexpected errors with Hono onError", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const { createHonoServer } = await import("../src/adapters/node");

      const app = await createHonoServer({
        defaultLogger: false,
        getLoadContext() {
          throw new Error("Test error outside React Router");
        },
      });

      app.onError((error, c) => {
        console.error("onError", error);
        return c.text("Caught unexpected error", 500);
      });

      const errorResponse = await app.request("http://127.0.0.1/");
      const errorText = await errorResponse.text();
      expect(errorResponse.status).toBe(500);
      expect(errorText).toBe("Caught unexpected error");
      expect(consoleErrorSpy).toHaveBeenCalledWith("onError", new Error("Test error outside React Router"));
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

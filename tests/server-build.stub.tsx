import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext, ServerBuild } from "react-router";
import { ServerRouter } from "react-router";

export const serverBuildStub: ServerBuild = {
  entry: {
    module: {
      default: handleRequest,
      handleDataRequest: (response) => response,
      handleError: (error: unknown, { request }) => {
        if (!request.signal.aborted) {
          console.error("handleError", error);
        }
      },
    },
  },
  routes: {
    root: {
      id: "root",
      path: "",
      module: {
        default: NullComponent,
        loader: async () => ({ id: "root" }),
      },
    },
    "routes/first": {
      id: "routes/first",
      parentId: "root",
      path: "first",
      module: {
        default: NullComponent,
        loader: async () => ({ id: "first" }),
      },
    },
    "routes/error": {
      id: "routes/error",
      parentId: "root",
      path: "error",
      module: {
        default: NullComponent,
        loader: () => {
          throw new Error("Test error from loader");
        },
      },
    },
    "routes/defer": {
      id: "routes/defer",
      parentId: "root",
      path: "defer",
      module: {
        default: NullComponent,
        loader: () => ({ id: new Promise((resolve) => setTimeout(() => resolve("defer"), 50)) }),
      },
    },
    "routes/resources/api": {
      id: "routes/resources/api",
      parentId: "root",
      path: "resources/api",
      module: {
        // @ts-expect-error - A resource route doesn't need a default export
        default: undefined,
        loader: async () => ({ id: "resources/api" }),
      },
    },
  },
  assets: {
    entry: { imports: [], module: "entry.client" },
    routes: {
      root: {
        id: "root",
        parentId: undefined,
        path: "",
        hasAction: false,
        hasLoader: true,
        hasClientAction: false,
        hasClientLoader: false,
        hasClientMiddleware: false,
        hasErrorBoundary: false,
        module: "app/root.tsx",
        clientActionModule: undefined,
        clientLoaderModule: undefined,
        clientMiddlewareModule: undefined,
        hydrateFallbackModule: undefined,
      },
      "routes/first": {
        id: "routes/first",
        parentId: "root",
        path: "first",
        hasAction: false,
        hasLoader: true,
        hasClientAction: false,
        hasClientLoader: false,
        hasClientMiddleware: false,
        hasErrorBoundary: false,
        module: "app/routes/first.tsx",
        clientActionModule: undefined,
        clientLoaderModule: undefined,
        clientMiddlewareModule: undefined,
        hydrateFallbackModule: undefined,
      },
      "routes/error": {
        id: "routes/error",
        parentId: "root",
        path: "error",
        hasAction: false,
        hasLoader: true,
        hasClientAction: false,
        hasClientLoader: false,
        hasClientMiddleware: false,
        hasErrorBoundary: false,
        module: "app/routes/error.tsx",
        clientActionModule: undefined,
        clientLoaderModule: undefined,
        clientMiddlewareModule: undefined,
        hydrateFallbackModule: undefined,
      },
      "routes/defer": {
        id: "routes/defer",
        parentId: "root",
        path: "defer",
        hasAction: false,
        hasLoader: true,
        hasClientAction: false,
        hasClientLoader: false,
        hasClientMiddleware: false,
        hasErrorBoundary: false,
        module: "app/routes/defer.tsx",
        clientActionModule: undefined,
        clientLoaderModule: undefined,
        clientMiddlewareModule: undefined,
        hydrateFallbackModule: undefined,
      },
      "routes/resources/api": {
        id: "routes/resources/api",
        parentId: "root",
        path: "resources/api",
        hasAction: false,
        hasLoader: true,
        hasClientAction: false,
        hasClientLoader: false,
        hasClientMiddleware: false,
        hasErrorBoundary: false,
        module: "app/routes/resources.api.tsx",
        clientActionModule: undefined,
        clientLoaderModule: undefined,
        clientMiddlewareModule: undefined,
        hydrateFallbackModule: undefined,
      },
    },
    url: "/build/manifest.json",
    version: "test",
  },
  basename: "/", // TODO: adjust for tests/create-hono-server.node.test.ts
  publicPath: "/build/",
  assetsBuildDirectory: "tests/fixtures/minimal-app/build/client",
  future: {
    unstable_subResourceIntegrity: false,
    v8_middleware: true,
  },
  ssr: true,
  isSpaMode: false,
  prerender: [],
  routeDiscovery: {
    mode: "initial",
    manifestPath: "/__manifest",
  },
};

function NullComponent() {
  return null;
}

const streamTimeout = 5_000;

function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
): Promise<Response> {
  return new Promise((resolve, reject) => {
    let shellRendered = false;

    // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
    // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
    const readyOption: keyof RenderToPipeableStreamOptions = routerContext.isSpaMode ? "onAllReady" : "onShellReady";

    const { pipe, abort } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} />, {
      [readyOption]() {
        shellRendered = true;
        const body = new PassThrough();
        const stream = createReadableStreamFromReadable(body);

        responseHeaders.set("Content-Type", "text/html");

        resolve(
          new Response(stream, {
            headers: responseHeaders,
            status: responseStatusCode,
          })
        );

        pipe(body);
      },
      onShellError(error: unknown) {
        reject(error);
      },
      onError(error: unknown) {
        responseStatusCode = 500;
        // Log streaming rendering errors from inside the shell.  Don't log
        // errors encountered during initial shell rendering since they'll
        // reject and get logged in handleDocumentRequest.
        if (shellRendered) {
          console.error(error);
        }
      },
    });

    // Abort the rendering stream after the `streamTimeout` so it has tine to
    // flush down the rejected boundaries
    setTimeout(abort, streamTimeout + 1000);
  });
}

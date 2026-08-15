import { expect, test } from "vitest";
import type { FixtureApp } from "../../helpers/fixture";
import { registerDevBrowserTests } from "./browser";

function loaderSource(message: string) {
  return `import { message as serverMessage } from "../message.server";

export async function loader() {
  return {
    message: ${JSON.stringify(message)},
    serverMessage,
  };
}

export default function LoaderRoute({
  loaderData,
}: {
  loaderData: { message: string; serverMessage: string };
}) {
  return (
    <div>
      <h1>{loaderData.message}</h1>
      <p>{loaderData.serverMessage}</p>
    </div>
  );
}
`;
}

const COMPONENT_V2 = `export default function ComponentRoute() {
  return <h1>component-v2</h1>;
}
`;

const RECOVERED = `export default function RecoverRoute() {
  return <div>recovered</div>;
}
`;

const DYNAMIC_ROUTE = `export default function DynamicRoute() {
  return <h1>dynamic-route</h1>;
}
`;

export function registerDevServerTests(getApp: () => FixtureApp) {
  test("boots the development server", async () => {
    const response = await getApp().fetch("/");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("SSR works");
  });

  test("runs a loader in development", async () => {
    const response = await getApp().fetch("/loader");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("hello-from-loader");
  });

  test("runs an action in development", async () => {
    const response = await getApp().fetch("/action", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        value: "hello-from-action",
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("hello-from-action");
  });

  registerDevBrowserTests(getApp);

  test("reloads component SSR after the route file changes", async () => {
    const app = getApp();
    expect(await app.text("/component")).toContain("component-v1");

    await app.edit("app/routes/component.tsx", COMPONENT_V2);

    await app.eventually(async () => {
      expect(await app.text("/component")).toContain("component-v2");
    });
  });

  test("reloads a shared server module without restart", async () => {
    const app = getApp();
    expect(await app.text("/loader")).toContain("server-v1");

    await app.edit("app/message.server.ts", `export const message = "server-v2";\n`);

    await app.eventually(async () => {
      expect(await app.text("/loader")).toContain("server-v2");
    });
  });

  test("discovers a route added while the dev server is running", async () => {
    const app = getApp();
    expect((await app.fetch("/dynamic")).status).toBe(404);

    await app.edit("app/routes/dynamic.tsx", DYNAMIC_ROUTE);

    await app.eventually(async () => {
      const response = await app.fetch("/dynamic");
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("dynamic-route");
    });
  });

  test("recovers after a route syntax error", async () => {
    const app = getApp();
    expect(app.alive).toBe(true);
    expect((await app.fetch("/recover")).status).toBe(200);

    await app.edit("app/routes/recover.tsx", "export default function RecoverRoute( {\n");

    await app.eventually(async () => {
      expect((await app.fetch("/recover")).status).not.toBe(200);
    });
    expect(app.alive).toBe(true);

    await app.edit("app/routes/recover.tsx", RECOVERED);

    await app.eventually(async () => {
      const response = await app.fetch("/recover");
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("recovered");
    });
    expect(app.alive).toBe(true);
  });

  test("keeps Hono routes working while React Router modules invalidate", async () => {
    const app = getApp();
    const health = await app.fetch("/api/health");
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true });
    expect(await app.text("/loader")).toContain("hello-from-loader");

    await app.edit("app/routes/loader.tsx", loaderSource("loader-v2"));

    await app.eventually(async () => {
      expect(await app.text("/loader")).toContain("loader-v2");
    });

    const healthAfter = await app.fetch("/api/health");
    expect(healthAfter.status).toBe(200);
    expect(await healthAfter.json()).toEqual({ ok: true });
    expect(app.alive).toBe(true);
  });
}

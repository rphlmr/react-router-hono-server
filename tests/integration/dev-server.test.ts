import { afterAll, beforeAll, expect, test } from "vitest";
import { DevServerFixture } from "../helpers/fixture";

const LOADER_V2 = `import { message as serverMessage } from "../message.server";

export async function loader() {
  return {
    message: "loader-v2",
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

let app: DevServerFixture;

beforeAll(async () => {
  app = await DevServerFixture.start("basic");
});

afterAll(async () => {
  await app?.stop();
});

test("boots the development server", async () => {
  const response = await app.fetch("/");

  expect(response.status).toBe(200);
  expect(await response.text()).toContain("SSR works");
});

test("runs a loader in development", async () => {
  const response = await app.fetch("/loader");

  expect(response.status).toBe(200);
  expect(await response.text()).toContain("hello-from-loader");
});

test("reloads a loader after the route file changes", async () => {
  await app.edit("app/routes/loader.tsx", LOADER_V2);

  await app.eventually(async () => {
    expect(await app.text("/loader")).toContain("loader-v2");
  });
});

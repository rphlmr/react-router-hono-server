import { afterAll, beforeAll } from "vite-plus/test";

import { type FixtureApp, ProductionFixture } from "../helpers/fixture";
import { registerDevServerTests } from "./contract/dev-server";

const futureConfig = `import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  future: {
    unstable_enableNodeReadableStream: true,
    unstable_optimizeDeps: true,
  },
} satisfies Config;
`;

let app: FixtureApp;

beforeAll(async () => {
  app = await ProductionFixture.create("basic", "node");
  await app.edit("react-router.config.ts", futureConfig);
  await app.startDev();
});

afterAll(async () => {
  await app?.stop();
});

registerDevServerTests(() => app);

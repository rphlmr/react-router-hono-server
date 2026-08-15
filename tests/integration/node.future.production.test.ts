import { afterAll, beforeAll } from "vite-plus/test";

import { type FixtureApp, ProductionFixture } from "../helpers/fixture";
import { registerProductionTests } from "./contract/production";

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
  await app.build();
  await app.startProduction();
});

afterAll(async () => {
  await app?.stop();
});

registerProductionTests(() => app);

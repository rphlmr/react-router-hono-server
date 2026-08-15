import { cp } from "node:fs/promises";
import path from "node:path";
import { type FixtureApp, ProductionFixture } from "../../helpers/fixture";
import type { RuntimeName } from "../../helpers/launchers";

const ALL_PRERENDER_CONFIG = `import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  prerender: true,
} satisfies Config;
`;

const CUSTOM_LAYOUT_CONFIG = `import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  basename: "/base",
  appDirectory: "custom-app",
  buildDirectory: "output",
  prerender: ["/"],
} satisfies Config;
`;

const SELECTED_PRERENDER_CONFIG = `import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  prerender: ["/", "/post/example"],
} satisfies Config;
`;

const CALLBACK_PRERENDER_CONFIG = `import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  prerender: {
    paths: async () => ["/loader"],
    concurrency: 2,
  },
} satisfies Config;
`;

const SPA_PRERENDER_CONFIG = `import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  buildDirectory: "spa-build",
  prerender: ["/", "/loader", "/post/example"],
} satisfies Config;
`;

export type PrerenderFixture = {
  app: FixtureApp;
  customLayout: { rootHtml: string };
  all: { rootHtml: string; loaderHtml: string; loaderData: string; dynamicHtmlMissing: boolean };
  selected: {
    rootHtml: string;
    dynamicHtml: string;
    dynamicData: string;
    loaderHtmlMissing: boolean;
    loaderDataMissing: boolean;
  };
  spa: { rootHtml: string; fallbackHtml: string };
  callback: { loaderHtml: string; loaderData: string; rootHtmlMissing: boolean };
};

export async function preparePrerenderFixture(runtime: RuntimeName): Promise<PrerenderFixture> {
  const app = await ProductionFixture.create("prerendered", runtime);

  await cp(path.join(app.cwd, "app"), path.join(app.cwd, "custom-app"), { recursive: true });
  await app.edit("react-router.config.ts", CUSTOM_LAYOUT_CONFIG);
  await app.build();
  const customLayout = {
    rootHtml: await app.read("output/client/base/index.html"),
  };

  await app.edit("react-router.config.ts", ALL_PRERENDER_CONFIG);
  await app.build();
  const all = {
    rootHtml: await app.read("build/client/index.html"),
    loaderHtml: await app.read("build/client/loader/index.html"),
    loaderData: await app.read("build/client/loader.data"),
    dynamicHtmlMissing: await isMissing(app, "build/client/post/example/index.html"),
  };

  await app.edit("react-router.config.ts", SELECTED_PRERENDER_CONFIG);
  await app.build();
  const selected = {
    rootHtml: await app.read("build/client/index.html"),
    dynamicHtml: await app.read("build/client/post/example/index.html"),
    dynamicData: await app.read("build/client/post/example.data"),
    loaderHtmlMissing: await isMissing(app, "build/client/loader/index.html"),
    loaderDataMissing: await isMissing(app, "build/client/loader.data"),
  };

  await app.edit("react-router.config.ts", SPA_PRERENDER_CONFIG);
  await app.build();
  const spa = {
    rootHtml: await app.read("spa-build/client/index.html"),
    fallbackHtml: await app.read("spa-build/client/__spa-fallback.html"),
  };

  await app.edit("react-router.config.ts", CALLBACK_PRERENDER_CONFIG);
  await app.build();
  const callback = {
    loaderHtml: await app.read("build/client/loader/index.html"),
    loaderData: await app.read("build/client/loader.data"),
    rootHtmlMissing: await isMissing(app, "build/client/index.html"),
  };

  return { app, customLayout, all, selected, spa, callback };
}

export function registerPrerenderBuildTests(getFixture: () => PrerenderFixture) {
  test("honors basename and custom application and build directories", () => {
    expect(getFixture().customLayout.rootHtml).toContain("SSR works");
  });

  test("prerenders every static route", () => {
    const { all } = getFixture();
    expect(all.rootHtml).toContain("SSR works");
    expect(all.loaderHtml).toContain("hello-from-loader");
    expect(all.loaderData).toContain("hello-from-loader");
    expect(all.dynamicHtmlMissing).toBe(true);
  });

  test("prerenders only an explicit array of routes", () => {
    const { selected } = getFixture();
    expect(selected.rootHtml).toContain("SSR works");
    expect(selected.dynamicHtml).toContain("example");
    expect(selected.dynamicData).toContain("example");
    expect(selected.loaderHtmlMissing).toBe(true);
    expect(selected.loaderDataMissing).toBe(true);
  });

  test("resolves routes from an async callback", () => {
    const { callback } = getFixture();
    expect(callback.loaderHtml).toContain("hello-from-loader");
    expect(callback.loaderData).toContain("hello-from-loader");
    expect(callback.rootHtmlMissing).toBe(true);
  });

  test("generates static documents and a SPA fallback when SSR is disabled", () => {
    const { spa } = getFixture();
    expect(spa.rootHtml).toContain("SSR works");
    expect(spa.fallbackHtml).toContain("<html");
  });
}

async function isMissing(app: FixtureApp, relativePath: string) {
  try {
    await app.read(relativePath);
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw error;
  }
}

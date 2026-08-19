import { cp } from "node:fs/promises";
import path from "node:path";

import type { RuntimeName } from "../../helpers/launchers";

import { type FixtureApp, ProductionFixture } from "../../helpers/fixture";

type PrerenderVariant = {
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

export type PrerenderFixture = {
  app: FixtureApp;
  withoutBasename: PrerenderVariant;
  withBasename: PrerenderVariant;
};

export async function preparePrerenderFixture(runtime: RuntimeName): Promise<PrerenderFixture> {
  const app = await ProductionFixture.create("prerendered", runtime);

  await cp(path.join(app.cwd, "app"), path.join(app.cwd, "custom-app"), { recursive: true });

  const withBasename = await preparePrerenderVariant(app, {
    basename: "/base/",
    appDirectory: "custom-app",
    buildDirectory: "output",
    spaBuildDirectory: "spa-output",
  });
  // Keep the root callback build last because the runtime assertions start this build.
  const withoutBasename = await preparePrerenderVariant(app, {
    buildDirectory: "build",
    spaBuildDirectory: "spa-build",
  });

  return { app, withoutBasename, withBasename };
}

export function registerPrerenderBuildTests(getFixture: () => PrerenderFixture) {
  const variants = [
    { label: "without basename", key: "withoutBasename" },
    { label: "with basename", key: "withBasename" },
  ] as const;

  test.each(variants)("prerenders every static route $label", ({ key }) => {
    const { all } = getFixture()[key];
    expect(all.rootHtml).toContain("SSR works");
    expect(all.loaderHtml).toContain("hello-from-loader");
    expect(all.loaderData).toContain("hello-from-loader");
    expect(all.dynamicHtmlMissing).toBe(true);
  });

  test.each(variants)("prerenders only an explicit array of routes $label", ({ key }) => {
    const { selected } = getFixture()[key];
    expect(selected.rootHtml).toContain("SSR works");
    expect(selected.dynamicHtml).toContain("example");
    expect(selected.dynamicData).toContain("example");
    expect(selected.loaderHtmlMissing).toBe(true);
    expect(selected.loaderDataMissing).toBe(true);
  });

  test.each(variants)("resolves routes from an async callback $label", ({ key }) => {
    const { callback } = getFixture()[key];
    expect(callback.loaderHtml).toContain("hello-from-loader");
    expect(callback.loaderData).toContain("hello-from-loader");
    expect(callback.rootHtmlMissing).toBe(true);
  });

  test.each(variants)(
    "generates static documents and a SPA fallback when SSR is disabled $label",
    ({ key }) => {
      const { spa } = getFixture()[key];
      expect(spa.rootHtml).toContain("SSR works");
      expect(spa.fallbackHtml).toContain("<html");
    },
  );
}

async function preparePrerenderVariant(
  app: FixtureApp,
  options: {
    basename?: string;
    appDirectory?: string;
    buildDirectory: string;
    spaBuildDirectory: string;
  },
): Promise<PrerenderVariant> {
  const documentPrefix = options.basename ? `${options.basename.replace(/^\/+|\/+$/g, "")}/` : "";
  const clientDirectory = `${options.buildDirectory}/client/${documentPrefix}`;

  await app.edit("react-router.config.ts", createConfig(options, { ssr: true, prerender: "true" }));
  await app.build();
  const all = {
    rootHtml: await app.read(`${clientDirectory}index.html`),
    loaderHtml: await app.read(`${clientDirectory}loader/index.html`),
    loaderData: await app.read(`${clientDirectory}loader.data`),
    dynamicHtmlMissing: await isMissing(app, `${clientDirectory}post/example/index.html`),
  };

  await app.edit(
    "react-router.config.ts",
    createConfig(options, { ssr: true, prerender: '["/", "/post/example"]' }),
  );
  await app.build();
  const selected = {
    rootHtml: await app.read(`${clientDirectory}index.html`),
    dynamicHtml: await app.read(`${clientDirectory}post/example/index.html`),
    dynamicData: await app.read(`${clientDirectory}post/example.data`),
    loaderHtmlMissing: await isMissing(app, `${clientDirectory}loader/index.html`),
    loaderDataMissing: await isMissing(app, `${clientDirectory}loader.data`),
  };

  await app.edit(
    "react-router.config.ts",
    createConfig(
      { ...options, buildDirectory: options.spaBuildDirectory },
      { ssr: false, prerender: '["/", "/loader", "/post/example"]' },
    ),
  );
  await app.build();
  const spa = {
    rootHtml: await app.read(`${options.spaBuildDirectory}/client/${documentPrefix}index.html`),
    fallbackHtml: await app.read(
      `${options.spaBuildDirectory}/client/${options.basename ? "index.html" : "__spa-fallback.html"}`,
    ),
  };

  await app.edit(
    "react-router.config.ts",
    createConfig(options, {
      ssr: true,
      prerender: '{ paths: async () => ["/loader"], concurrency: 2 }',
    }),
  );
  await app.build();
  const callback = {
    loaderHtml: await app.read(`${clientDirectory}loader/index.html`),
    loaderData: await app.read(`${clientDirectory}loader.data`),
    rootHtmlMissing: await isMissing(app, `${clientDirectory}index.html`),
  };

  return { all, selected, spa, callback };
}

function createConfig(
  options: { basename?: string; appDirectory?: string; buildDirectory: string },
  config: { ssr: boolean; prerender: string },
) {
  const optionalConfig = [
    options.basename ? `  basename: ${JSON.stringify(options.basename)},` : undefined,
    options.appDirectory ? `  appDirectory: ${JSON.stringify(options.appDirectory)},` : undefined,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return `import type { Config } from "@react-router/dev/config";

export default {
  ssr: ${config.ssr},
${optionalConfig ? `${optionalConfig}\n` : ""}  buildDirectory: ${JSON.stringify(options.buildDirectory)},
  prerender: ${config.prerender},
} satisfies Config;
`;
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

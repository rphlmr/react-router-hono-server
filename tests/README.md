# Trusted runtime tests

The suite builds and packs the library once, copies a consumer fixture to a temporary directory, injects the generated tarball, installs it with the selected runtime package manager, runs React Router type generation and TypeScript, and then exercises the documented commands.

```sh
pnpm install
pnpm test:suite
```

Targeted commands are `pnpm test:node`, `pnpm test:bun`, `pnpm test:deno`, `pnpm test:cloudflare`, `pnpm test:aws`, and `pnpm test:package`. Runtime binaries and Playwright Chromium are required; their absence fails the relevant suite.

The common source fixture is `tests/fixtures/basic`. Runtime overlays in `tests/fixtures/overlays` replace only runtime-specific Vite, server-entry, React server-entry, and platform configuration files. Each temporary consumer owns its manifest, generated lockfile, and `node_modules`; nothing links to the repository installation.

The typed definitions in `tests/helpers/launchers.ts` are the source of truth for install, build, development, production, and typecheck commands. The harness adds only a loopback host, allocated port, and strict-port arguments to server commands.

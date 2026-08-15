# Test architecture

This suite tests `react-router-hono-server` as a package consumer would use it.

It does not run integration fixtures against source files or reuse the repository's dependency installation.

The test harness builds and packs the library, then installs that tarball into isolated applications.

From there, it runs React Router type generation and TypeScript before exercising development, production, prerendering, and CLI behavior on every supported runtime.

## Contents

- [What the suite protects](#what-the-suite-protects)
- [How an integration test runs](#how-an-integration-test-runs)
- [Fixtures and runtime overlays](#fixtures-and-runtime-overlays)
- [Shared runtime contracts](#shared-runtime-contracts)
- [Package and CLI tests](#package-and-cli-tests)
- [Pull request and nightly protection](#pull-request-and-nightly-protection)
- [Running the tests locally](#running-the-tests-locally)
- [Requirements and failure behavior](#requirements-and-failure-behavior)
- [Adding coverage](#adding-coverage)

## What the suite protects

The tests cover the boundaries most likely to break when this package, React Router, Vite, or a runtime changes:

- the published tarball contains every public export, declaration file, adapter, and executable;
- a consumer resolves the packed package instead of files from this repository;
- React, React DOM, React Router, Hono, and Vite are not duplicated between the application and the package;
- React Router type generation and TypeScript succeed in the consumer application;
- development servers boot, reload changed modules, discover routes, recover from syntax errors, and preserve Hono routes;
- production builds serve SSR documents, loaders, actions, redirects, errors, streaming responses, data requests, public assets, and Hono context correctly;
- browser hydration, navigation, submissions, assets, and HMR work in Chromium;
- prerendering produces the correct files and preserves runtime SSR where applicable;
- runtime-specific entry points work on Node.js, Bun, Deno, Cloudflare Workers, and AWS Lambda;
- the installed `reveal` CLI generates usable server entries for every runtime.

This is intentionally closer to an end-to-end compatibility suite than a collection of unit tests.

A passing source build alone would not detect packaging errors, peer dependency duplication, runtime startup failures, or changes in React Router's build behavior.

## How an integration test runs

`pnpm test:suite` performs these stages:

1. `tests/prepare.ts` builds the library and creates one npm tarball in `out/test-artifacts`.
2. The harness creates a fresh application under the operating system's temporary directory, with a name such as `react-router-hono-server-deno-basic-*`.
3. It copies the base fixture, applies an optional scenario fixture, and then applies the selected runtime overlay.
4. It replaces the fixture scripts with the commands defined for that runtime in `tests/helpers/launchers.ts`.
5. It installs the packed tarball with the runtime's package manager: pnpm, Bun, or Deno.
6. It verifies that the installed adapter resolves outside the repository and that important peer dependencies have a single resolution.
7. It runs `react-router typegen` followed by `tsc --noEmit`.
8. The test builds or starts the application and verifies it through HTTP, browser automation, generated files, or the runtime's native handler interface.
9. The managed process is stopped and the temporary application is removed.

Every temporary consumer owns its manifest, lockfile, generated React Router types, build output, and `node_modules`.

Nothing is linked to the repository installation.

This isolation catches problems that can otherwise be hidden by workspace dependency hoisting or direct access to source files.

The runtime commands live in `tests/helpers/launchers.ts`.

They are the single source of truth for installation, development, build, production, and typecheck behavior. The harness only adds an allocated loopback port and strict host/port arguments where a server requires them.

## Fixtures and runtime overlays

The fixture system builds applications in layers:

```text
tests/fixtures/basic
        +
tests/fixtures/<scenario>
        +
tests/fixtures/overlays/<runtime>
        =
isolated temporary consumer application
```

`tests/fixtures/basic` is the shared React Router application.

It contains routes for loaders, actions, redirects, errors, deferred data, Hono context, live reload, assets, and browser interaction.

Scenario fixtures replace only the files needed for a feature.

For example, `tests/fixtures/prerendered` adds the dynamic route and configuration used by the prerender contract.

Runtime overlays replace platform-specific files such as the Vite configuration, server entry, React server entry, and deployment configuration.

Keeping the application shared makes differences between adapters explicit and lets the same behavioral contract run against each platform.

## Shared runtime contracts

Reusable contracts under `tests/integration/contract` define behavior once and run it against the adapters that support it:

- `dev-server.ts` covers server startup, loaders, actions, module invalidation, route discovery, syntax-error recovery, and Hono route stability.
- `production.ts` covers the build and the complete production request path.
- `browser.ts` covers hydration and browser HMR with Playwright Chromium.
- `prerender.ts` covers React Router's supported prerender modes.

The prerender contract runs against Node.js, Bun, Deno, Cloudflare Workers, and AWS Lambda. It verifies:

- `prerender: true` for all discoverable static routes;
- an explicit array containing static and concrete dynamic paths;
- asynchronous path discovery with configured concurrency;
- generated HTML and route data files;
- `ssr: false` output and its SPA fallback;
- runtime SSR fallback for paths that were not prerendered;
- basename handling;
- custom application and build directories.

Runtime-specific files add assertions that cannot be expressed as a common HTTP contract, such as Node.js WebSockets and the AWS Lambda handler shape.

## Package and CLI tests

The package tests inspect the artifact that would be published to npm:

- `publint` validates package metadata and module packaging;
- `attw` checks the exported type surface using the ESM-only profile;
- `tests/package/public-surface.test.ts` verifies all declared runtime files, declarations, exports, and the CLI binary;
- `tests/package/documentation.test.ts` keeps documented runtime configuration and commands consistent with the supported public surface.

The CLI integration tests invoke binaries from the isolated consumer's `node_modules/.bin`.

They verify that this package's `reveal` command generates a working file or folder entry for every adapter. They also verify that React Router's own `reveal` command still exposes compatible rendering entries.

## Pull request and nightly protection

The suite has two complementary compatibility layers.

### Pull requests: reproducible regression checks

The pull request workflow uses the committed lockfile and the project's supported runtime versions.

Separate jobs run package checks, documentation checks, Node.js and AWS tests, Bun tests, Deno tests, and Cloudflare Workers tests.

This answers: **does this change preserve the behavior and dependency set reviewed in the repository?**

Splitting runtimes into jobs makes failures attributable to a platform and prevents one unavailable runtime from hiding the results of another.

### Nightly: early warning for upstream changes

The `Latest compatible runtimes` workflow runs every day at 03:00 UTC and can also be started manually.

It installs the latest stable Node.js, Bun, and Deno releases, then runs package checks and each runtime suite in
parallel jobs.

The workflow sets `RRHS_LATEST_COMPATIBLE=1`.

During test preparation, the harness queries the npm registry for the newest release within every supported major of the compatibility-sensitive dependencies. This includes React Router, React, Vite, Hono, the Cloudflare Vite plugin, Wrangler, and the Node adapter.

Those resolved versions are injected into each isolated consumer before installation.

This answers: **would a new release inside one of our declared compatibility ranges break a fresh consumer today?**

The nightly run is especially important for upstream behavior that is not a formal public contract.

For example, if React Router changes its build-time rendering lifecycle, the prerender tests must still build every mode on every adapter and preserve each platform's static-output and SSR behavior.

A behavior change therefore fails at the consumer level even when the package itself still compiles.

Together, the workflows protect against two different regression classes:

| Check | Dependency selection | Main purpose |
| --- | --- | --- |
| Pull request | Committed lockfile | Detect regressions introduced by repository changes |
| Nightly | Latest releases within supported majors | Detect ecosystem and runtime regressions before users report them |

The nightly jobs are detection, not a claim that upstream internals cannot change.

Its value is that failures appear within the daily compatibility cycle and identify which real consumer behavior stopped working.

## Running the tests locally

Install dependencies and run everything:

```sh
pnpm install
pnpm test:suite
```

Run one runtime or test layer while developing:

| Command | Coverage |
| --- | --- |
| `pnpm test:node` | Node.js development, production, prerender, and WebSocket tests |
| `pnpm test:bun` | Bun development, production, and prerender tests |
| `pnpm test:deno` | Deno development, production, and prerender tests |
| `pnpm test:cloudflare` | Cloudflare development, production, and prerender tests |
| `pnpm test:aws` | AWS Lambda production and prerender tests |
| `pnpm test:package` | Packed artifact, exports, types, utilities, and documentation contracts |

Each targeted runtime command rebuilds and repacks the library first.

When iterating on tests without changing package output, prepare once and invoke Vitest directly against a focused file:

```sh
pnpm test:prepare
pnpm vitest run tests/integration/node.production.test.ts
```

To reproduce the nightly dependency selection locally:

```sh
RRHS_LATEST_COMPATIBLE=1 pnpm test:suite
```

That mode queries the npm registry and may update only the manifests and lockfiles inside temporary fixtures.

It does not modify the repository lockfile.

## Requirements and failure behavior

The complete suite requires:

- Node.js and pnpm;
- Bun;
- Deno;
- Playwright Chromium and its system dependencies.

Install the browser with:

```sh
pnpm exec playwright install chromium
```

Runtime coverage is not silently skipped.

If a requested Bun or Deno suite cannot find its binary, the suite fails with an explicit requirement error. The CI workflows install every required runtime and Chromium before running their tests.

Integration tests within a file run serially when they share a managed server. Isolated integration files run with at
most two workers because each fixture owns its temporary directory, build output, and allocated loopback port. Package
tests may run in parallel.

Servers use allocated loopback ports, and startup failures include captured process logs to make diagnosis practical.

## Adding coverage

Choose the narrowest layer that represents the behavior:

1. Add cross-runtime request behavior to a shared contract in `tests/integration/contract`.
2. Register that contract from each applicable runtime test file.
3. Add platform-only behavior to the corresponding runtime test.
4. Add application behavior to `tests/fixtures/basic` when all scenarios need it.
5. Add a scenario fixture only when configuration or routes materially differ from the base application.
6. Add a runtime overlay only for files that genuinely vary by platform.
7. Update `tests/helpers/launchers.ts` when the documented consumer command changes.

Assertions should verify observable consumer behavior: generated artifact contents, HTTP semantics, browser behavior, type generation, or native platform handler output.

Avoid asserting incidental implementation details when the same regression can be caught through the public contract.

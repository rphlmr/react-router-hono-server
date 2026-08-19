# react-router-hono-server

## 4.0.1

### Patch Changes

- [#245](https://github.com/rphlmr/react-router-hono-server/pull/245) [`5fde612`](https://github.com/rphlmr/react-router-hono-server/commit/5fde6129a81d8bd5c2b55ea637d2e228c677f7f0) Thanks [@rphlmr](https://github.com/rphlmr)! - ## Summary

  - Support independent React Router `basename` and Vite `base` URL spaces across development and production.
  - Route generated JavaScript and CSS assets according to Vite’s base while preserving document, route-data, and public-directory URL ownership.

  ## What's changed

  ### Vite base routing
  - **Development server:** Propagate Vite’s configured `base` through the plugin environment and scope Hono’s module, dependency, and asset exclusions to the Vite pathname prefix, including absolute and full-URL bases.
  - **Node, Bun, and Deno adapters:** Serve generated assets beneath an absolute pathname base and strip that prefix before resolving files, while preserving user-provided asset rewrite callbacks.
  - **Cloudflare adapter:** Match generated assets under an absolute Vite base and remove the pathname prefix before forwarding requests to the asset binding.
  - **Shared path handling:** Add classification and normalization for root, absolute, full-URL, and relative Vite bases. Full-URL and relative bases remain externally/Vite-owned rather than creating a fixed server-side mount.
  - **Documentation and release metadata:** Document independent `basename`/`base` configuration, runtime-specific asset ownership, and the patch release covering the fix.

  ## Compatibility
  - React Router’s `basename` continues to control documents, route data, and the handler independently from Vite-generated URLs.
  - Root-relative behavior remains unchanged; relative bases (`""` and `"./"`) preserve Vite-emitted URLs, and public-directory files remain served from the origin root.
  - AWS production continues to leave generated assets externally owned.

  ## Test coverage
  - Added unit coverage for Vite base classification, generated-asset route mapping, prefix stripping, and composition with adapter rewrite callbacks.
  - Added integration coverage across development, Node/Bun/Deno production, Cloudflare asset bindings, AWS production, nested and root document basenames, full-URL bases, and relative bases.
  - Updated development-plugin tests and fixture preparation to exercise Vite base configuration and generated CSS/asset URLs.

## 4.0.0

### Major Changes

- [#241](https://github.com/rphlmr/react-router-hono-server/pull/241) [`ea4fbe9`](https://github.com/rphlmr/react-router-hono-server/commit/ea4fbe96f0e77c8dcede4a7a940eb5ac25f8defc) Thanks [@rphlmr](https://github.com/rphlmr)! - ## React Router Hono Server v4

  Version 4 aligns the package with React Router 8.3 and defines an explicit compatibility contract across Node.js, Bun, Deno, Cloudflare Workers, and AWS Lambda.

  ### Breaking changes
  - Require Node.js 24.19+, React 19.2, React Router 8.3+, Vite 8, and Hono 4. Bun 1.3+, Deno 2, and the current Cloudflare Vite/Wrangler 4 toolchain are required for their respective runtimes.
  - `@hono/node-server` 2 is now installed as an implementation dependency. Remove it from application dependencies unless application code imports it directly.
  - Remove React 18, React Router 7, the `force_react_19` compatibility flag, and the legacy Cloudflare proxy integration.
  - Use React Router’s dependency-selected server entries: `@react-router/node` for Node.js and AWS, and the Web Streams entry for Bun, Deno, and Cloudflare unless a custom server entry is provided.
  - Return a `RouterContextProvider` from `getLoadContext`; React Router middleware is now unconditional.
  - Await `createHonoServer()` in server entries and import the adapter matching the selected runtime.
  - Replace legacy Cloudflare Vite/Miniflare configuration with `@cloudflare/vite-plugin`, Workerd development, an `ASSETS` binding, and the `nodejs_compat` flag. Plugin order is significant.
  - Remove `@hono/node-ws`. Node WebSockets now use the implementation integrated with `@hono/node-server` 2.

  ### Added
  - Support Hono WebSockets in development and production across Node.js, Bun, Deno, and Cloudflare Workers.
  - Use runtime-native WebSocket implementations in production, with the `@hono/node-server` bridge for Node.js and Vite development on Bun and Deno.
  - Expose Node’s underlying `ws.WebSocketServer` as `wss` in the WebSocket `configure` callback.
  - Support React Router 8.3’s `unstable_enableNodeReadableStream` and `unstable_optimizeDeps` options through `react-router.config.ts`.
  - Support SSR, SPA output, prerendering, static assets, and runtime SSR fallback across the supported adapters.
  - Add runtime-specific integration coverage and reusable fixtures for Node.js, Bun, Deno, Cloudflare Workers, and AWS Lambda.

  ### Fixed
  - Chrome DevTools workspace-discovery requests are no longer forwarded to React Router’s catch-all route during development. Applications can opt in by adding `public/.well-known/appspecific/com.chrome.devtools.json`.
  - Vite HMR and application WebSocket upgrades now coexist on the same Node.js development server.

  ### Migration

  See [`MIGRATION.md`](../MIGRATION.md) for the complete 3.x to 4.0 migration checklist, including dependency updates, server-entry changes, React Router context migration, Cloudflare configuration, WebSocket setup, and clean-install verification.

### Patch Changes

- [#244](https://github.com/rphlmr/react-router-hono-server/pull/244) [`afd1e4b`](https://github.com/rphlmr/react-router-hono-server/commit/afd1e4b7c2113d6bfef26ed1f530bda930808ffa) Thanks [@rphlmr](https://github.com/rphlmr)! - ci: 🎡 use system Chrome in CI

## 3.0.0

### Major Changes

- [#235](https://github.com/rphlmr/react-router-hono-server/pull/235) [`d24ade3`](https://github.com/rphlmr/react-router-hono-server/commit/d24ade37825b5a76ab14e5fb9f422450f8f57abd) Thanks [@rphlmr](https://github.com/rphlmr)! - feat: ✨ Bump to React Router v8

### Patch Changes

- [#235](https://github.com/rphlmr/react-router-hono-server/pull/235) [`d24ade3`](https://github.com/rphlmr/react-router-hono-server/commit/d24ade37825b5a76ab14e5fb9f422450f8f57abd) Thanks [@rphlmr](https://github.com/rphlmr)! - feat: ✨ Update Vite configuration and package paths for React Router v8 support

## 3.0.0-next.0

### Major Changes

- [#235](https://github.com/rphlmr/react-router-hono-server/pull/235) [`d24ade3`](https://github.com/rphlmr/react-router-hono-server/commit/d24ade37825b5a76ab14e5fb9f422450f8f57abd) Thanks [@rphlmr](https://github.com/rphlmr)! - feat: ✨ Bump to React Router v8

### Patch Changes

- [#235](https://github.com/rphlmr/react-router-hono-server/pull/235) [`d24ade3`](https://github.com/rphlmr/react-router-hono-server/commit/d24ade37825b5a76ab14e5fb9f422450f8f57abd) Thanks [@rphlmr](https://github.com/rphlmr)! - feat: ✨ Update Vite configuration and package paths for React Router v8 support

## 2.26.0

### Minor Changes

- 15f28de: feat: add Deno support

## 2.25.3

### Patch Changes

- 6cbb781: update hono node server

## 2.25.2

### Patch Changes

- 494127c: fix: 🔨 hono cve

## 2.25.1

### Patch Changes

- c8acef5: update hono

## 2.25.0

### Minor Changes

- 8a64698: ✨ feat: Added optional production graceful shutdown for bun adapter.

## 2.24.1

### Patch Changes

- f207d80: chore: 🔨 Update hono and related dependencies. Make hono a peer dep

## 2.24.0

### Minor Changes

- f1f2e3d: chore: 🔨 Update hono dependencies

### Patch Changes

- 1defe62: Add compatibility with environment API being promoted to v8 instead of unstable in React Router

## 2.23.0

### Minor Changes

- 0ccf170: chore: bump hono to v4.11.4 ([#173](https://github.com/rphlmr/react-router-hono-server/issues/173))

## 2.22.0

### Minor Changes

- 179e2ea: Upgrade to latest hono

## 2.21.0

### Minor Changes

- ee2abf2: Add support for React Router 7.8.0 unstable middleware changes

## 2.20.0

### Minor Changes

- 23eac74: make modules imported by the server entry a chunk

## 2.19.0

### Minor Changes

- 9703630: Prevent build import conflicts by splitting imports into chunks
- 9703630: Rollback single file server output (revert to 2.16.0 behavior)

## 2.18.0

### Minor Changes

- dacbc3a: Make Bun use the same entry.server as Node

### Patch Changes

- dacbc3a: Fix wrong peer deps

## 2.17.0

### Minor Changes

- 482a557: Upgrade hono dependencies
- 8eae0a7: ## Node and Bun
  - Lock Hono Node Server version to temporarily fix defer issue.
    - Bundle `@hono/node-server` and `@hono/vite-dev-server` to make sure the correct version is used. This will be reverted once the issue is resolved in Hono.
  - Improve performance by awaiting the import of React Router build before starting the server. (instead of awaiting it in the first request)
    - If your server bundle is large, import can take a while, so this change will improve the first request performance since it will be done before the server starts listening.

### Patch Changes

- 1a21a8b: remove obsolete build target options from reactRouterHonoServer
- 9bf869b: Statically import RR build

## 2.17.0-next.2

### Patch Changes

- 1a21a8b: remove obsolete build target options from reactRouterHonoServer

## 2.17.0-next.1

### Patch Changes

- 9bf869b: Statically import RR build

## 2.17.0-next.0

### Minor Changes

- 8eae0a7: ## Node and Bun
  - Lock Hono Node Server version to temporarily fix defer issue.
    - Bundle `@hono/node-server` and `@hono/vite-dev-server` to make sure the correct version is used. This will be reverted once the issue is resolved in Hono.
  - Improve performance by awaiting the import of React Router build before starting the server. (instead of awaiting it in the first request)
    - If your server bundle is large, import can take a while, so this change will improve the first request performance since it will be done before the server starts listening.

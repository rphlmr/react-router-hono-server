---
"react-router-hono-server": major
---

## React Router Hono Server v4

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
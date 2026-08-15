---
"react-router-hono-server": major
---

## Changelog

Version 4 aligns the package with React Router 8.3 and establishes an explicit compatibility contract across the supported runtimes.

### Breaking changes

- Require Node.js 24.19+, React 19.2, React Router 8.3+, Vite 8, Hono 4, and `@hono/node-server` 2. Bun 1.3+, Deno 2, and the current Cloudflare Vite/Wrangler 4 toolchain are required for their respective runtimes.
- Remove React 18, React Router 7, the `force_react_19` compatibility flag, and the legacy Cloudflare proxy integration.
- Follow React Router's dependency-selected server entries. Node.js and AWS applications should use `@react-router/node`; Bun, Deno, and Cloudflare applications should use React Router's Web Streams entry unless they provide a custom server entry.
- Return a `RouterContextProvider` from `getLoadContext`; React Router middleware is now unconditional.
- Await `createHonoServer()` in server entries and use the matching runtime adapter import.
- Replace legacy Cloudflare Vite/Miniflare setup with the official `@cloudflare/vite-plugin`, Workerd development, an `ASSETS` binding, and the `nodejs_compat` flag. Plugin order is significant.
- Remove `@hono/node-ws`; Node WebSockets now use the implementation integrated with `@hono/node-server` 2.

### Added

- Support Hono WebSockets in development and production across Node, Bun, Deno, and Cloudflare Workers.
- Support React Router 8.3's optional `unstable_enableNodeReadableStream` and `unstable_optimizeDeps` flags through `react-router.config.ts`; these remain React Router configuration rather than Hono plugin options.
- Expose Node's underlying `ws.WebSocketServer` as `wss` in the WebSocket `configure` callback.
- Use runtime-native WebSocket implementations in production, with the `@hono/node-server` bridge for Node and Vite development on Bun and Deno.
- Support React Router SSR, SPA output, prerendering, static assets, and runtime SSR fallback through the Node, Bun, Deno, Cloudflare Workers, and AWS Lambda adapters.
- Provide executable documentation and reusable runtime fixtures in place of the maintained example projects.

### Fixed

- Avoid forwarding Chrome DevTools automatic workspace discovery requests to React Router in development. Projects can opt in by adding `public/.well-known/appspecific/com.chrome.devtools.json`.
- Keep Vite HMR and application WebSocket upgrades from competing for the same Node development server.

## Notes

- Third-party Sentry, database, queue, Socket.IO, and similar integration examples are no longer part of the package's maintained support contract.
- The release is validated from packed package artifacts across the supported runtimes, including development, production, prerendering, CLI, public exports, and type contracts.
- See `MIGRATION.md` for the complete 3.x to 4.0 migration checklist.

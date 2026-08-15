# Integration tests

Black-box tests that start a real React Router + Hono app through the public API.

```sh
pnpm install
pnpm build
pnpm test
```

The Node fixture lives in `tests/fixtures/basic`. Helpers copy it to a temp directory, symlink `node_modules`, and spawn:

- production: `react-router build` then `node ./build/server/index.js`
- development: `react-router dev --host 127.0.0.1 --port <free> --strictPort`

Production also covers deferred streaming, Hono load context, redirects, and non-200 responses. Dev also covers component/server-module invalidation, added routes, syntax-error recovery, and Hono routes surviving React Router reloads.

Bun / Deno / Cloudflare launchers are not in this wave.

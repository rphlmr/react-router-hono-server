# Integration tests

Black-box tests that start a real React Router + Hono app through the public API.

```sh
pnpm install
pnpm test:suite
```

`test:suite` builds the library, then runs Vitest. Use `pnpm test:node`, `pnpm test:bun`, `pnpm test:deno`, or `pnpm test:cloudflare` to target one runtime.

The Node fixture lives in `tests/fixtures/basic`. Runtime overlays live in `tests/fixtures/overlays/<runtime>` and replace `vite.config.ts` / `app/server.ts` after the fixture is copied to a temp directory.

Helpers spawn:

- Node production: `react-router build` then `node ./build/server/index.js`
- Node development: `react-router dev --host 127.0.0.1 --port <free> --strictPort`
- Bun production: `bun ./build/server/index.js`
- Bun development: `bunx --bun vite --configLoader runner --host 127.0.0.1 --port <free> --strictPort`
- Deno production: `deno run --unstable-cron -A ./build/server/index.js`
- Deno development: `deno run --unstable-cron -A npm:vite dev --host 127.0.0.1 --port <free> --strictPort`

- Cloudflare production: `react-router build` then `vite preview --host 127.0.0.1 --port <free> --strictPort`
- Cloudflare development: `vite dev --host 127.0.0.1 --port <free> --strictPort`

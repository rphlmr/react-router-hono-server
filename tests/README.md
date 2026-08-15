# Integration tests

Black-box tests that start a real React Router + Hono app through the public API.

```sh
pnpm install
pnpm test:suite
```

`test:suite` builds the library, then runs Vitest. Use `pnpm test:node`, `pnpm test:bun`, or `pnpm test:deno` to target one runtime.

The Node fixture lives in `tests/fixtures/basic`. Runtime overlays live in `tests/fixtures/overlays/<runtime>` and replace `vite.config.ts` / `app/server.ts` after the fixture is copied to a temp directory.

Helpers spawn:

- Node production: `react-router build` then `node ./build/server/index.js`
- Node development: `react-router dev --host 127.0.0.1 --port <free> --strictPort`
- Bun production: `bun ./build/server/index.js`
- Bun development is skipped for now: `bunx --bun vite` crashes React Router typegen (`generate is not a function`), and the Bun adapter cannot boot under Node Vite (`Bun is not defined`).
- Deno production: `deno run --unstable-cron -A ./build/server/index.js`
- Deno development is skipped for now: the first Deno contract is production HTTP. `deno run ... npm:vite` is slower, and the Deno adapter cannot boot under Node Vite (`Deno` is not defined).

Cloudflare launchers are not in this wave.

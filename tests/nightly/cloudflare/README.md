# Cloudflare Workers nightly container

This image reproduces the Cloudflare Workers portion of
`.github/workflows/nightly.yaml` with Node.js 24, Vite+, and the Playwright
browsers available. The project dependencies provide Wrangler and workerd.

Run it from the repository root:

```sh
vp run test:cloudflare:nightly:docker
```

The repository is mounted read-only and copied inside the container before the
nightly dependency updates run. Pass a command after the image name to inspect
the prepared worktree without running the tests:

```sh
docker run --rm -it \
  --mount "type=bind,source=$PWD,target=/source,readonly" \
  react-router-hono-server-nightly-cloudflare \
  bash
```

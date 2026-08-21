# Deno nightly container

This image reproduces the Deno portion of `.github/workflows/nightly.yaml` with
Node.js 24, the latest Deno release, Vite+, and the Playwright browsers
available.

Run it from the repository root:

```sh
vp run test:deno:nightly:docker
```

The repository is mounted read-only and copied inside the container before the
nightly dependency updates run. Pass a command after the image name to inspect
the prepared worktree without running the tests:

Use a versioned binary tag such as `--build-arg DENO_VERSION=bin-2.0.0` when
building manually to test a specific Deno release.

```sh
docker run --rm -it \
  --mount "type=bind,source=$PWD,target=/source,readonly" \
  react-router-hono-server-nightly-deno \
  bash
```

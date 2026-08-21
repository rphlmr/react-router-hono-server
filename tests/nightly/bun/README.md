# Bun nightly container

This image reproduces the Bun portion of `.github/workflows/nightly.yaml` with
Node.js 24, the latest Bun release, Vite+, and the Playwright browsers already
available.

Run the nightly-compatible Bun tests from the repository root:

```sh
vp run test:bun:nightly:docker
```

The repository is mounted read-only and copied inside the container before the
nightly dependency updates run. The host manifests, lockfile, dependencies, and
generated test artifacts are not changed.

To test the minimum supported Bun release instead, rebuild and run the image:

```sh
docker build \
  --build-arg BUN_VERSION=1.4.0 \
  --file tests/nightly/bun/Dockerfile \
  --tag react-router-hono-server-nightly-bun:1.4.0 \
  tests/nightly

docker run --rm --ipc=host \
  --mount "type=bind,source=$PWD,target=/source,readonly" \
  react-router-hono-server-nightly-bun:1.4.0
```

Pass a command after the image name to inspect the prepared worktree without
running the tests:

```sh
docker run --rm -it \
  --mount "type=bind,source=$PWD,target=/source,readonly" \
  react-router-hono-server-nightly-bun \
  bash
```

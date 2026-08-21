# AWS Lambda nightly container

This image reproduces the AWS Lambda portion of `.github/workflows/nightly.yaml`
with Node.js 24 and Vite+. The AWS tests exercise the Lambda adapter directly
and do not require a browser or AWS credentials.

Run it from the repository root:

```sh
vp run test:aws:nightly:docker
```

The repository is mounted read-only and copied inside the container before the
nightly dependency updates run. Pass a command after the image name to inspect
the prepared worktree without running the tests:

```sh
docker run --rm -it \
  --mount "type=bind,source=$PWD,target=/source,readonly" \
  react-router-hono-server-nightly-aws \
  bash
```

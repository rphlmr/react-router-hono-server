ARG BUN_VERSION=latest

FROM oven/bun:${BUN_VERSION} AS bun

FROM mcr.microsoft.com/playwright:v1.62.1-noble

ARG VITE_PLUS_VERSION=latest

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

RUN curl -fsSL https://vite.plus | VP_VERSION="${VITE_PLUS_VERSION}" bash

ENV PATH="/root/.vite-plus/bin:${PATH}"

RUN vp env install 24

ENV RRHS_NIGHTLY_RUNTIME=bun

COPY run.sh /usr/local/bin/run-nightly
RUN chmod 755 /usr/local/bin/run-nightly

WORKDIR /worktree

ENTRYPOINT ["run-nightly"]

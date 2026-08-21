ARG DENO_VERSION=bin

FROM denoland/deno:${DENO_VERSION} AS deno

FROM mcr.microsoft.com/playwright:v1.62.1-noble

ARG VITE_PLUS_VERSION=latest

COPY --from=deno /deno /usr/local/bin/deno

RUN curl -fsSL https://vite.plus | VP_VERSION="${VITE_PLUS_VERSION}" bash

ENV PATH="/root/.vite-plus/bin:${PATH}"
ENV RRHS_NIGHTLY_RUNTIME=deno

RUN vp env install 24

COPY run.sh /usr/local/bin/run-nightly
RUN chmod 755 /usr/local/bin/run-nightly

WORKDIR /worktree

ENTRYPOINT ["run-nightly"]

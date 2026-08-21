FROM mcr.microsoft.com/playwright:v1.62.1-noble

ARG VITE_PLUS_VERSION=latest

RUN curl -fsSL https://vite.plus | VP_VERSION="${VITE_PLUS_VERSION}" bash

ENV PATH="/root/.vite-plus/bin:${PATH}"
ENV RRHS_NIGHTLY_RUNTIME=node

RUN vp env install 24

COPY run.sh /usr/local/bin/run-nightly
RUN chmod 755 /usr/local/bin/run-nightly

WORKDIR /worktree

ENTRYPOINT ["run-nightly"]

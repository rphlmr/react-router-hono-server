ARG VITE_PLUS_VERSION=latest

FROM ghcr.io/voidzero-dev/vite-plus:${VITE_PLUS_VERSION}

USER root

ENV RRHS_NIGHTLY_RUNTIME=aws

RUN vp env install 24

COPY run.sh /usr/local/bin/run-nightly
RUN chmod 755 /usr/local/bin/run-nightly

WORKDIR /worktree

ENTRYPOINT ["run-nightly"]

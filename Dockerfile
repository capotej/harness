FROM debian:stable-slim@sha256:d3bb822478c18e70b4cfbf64c38591524c24d9e2cb3a9100083e3e892a10030e

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    fd-find \
    gnupg \
    iputils-ping \
    jq \
    ripgrep \
    vim \
    && ln -s /usr/bin/fdfind /usr/local/bin/fd \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate && \
    pnpm install -g @mariozechner/pi-coding-agent@0.66.1

RUN mkdir -p /root/.pi/agent

COPY models.json /root/.pi/agent/models.json

WORKDIR /app

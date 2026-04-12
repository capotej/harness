FROM debian:stable-slim

RUN apt-get update && apt-get install -y \
    curl \
    fd-find \
    gnupg \
    iputils-ping \
    jq \
    ripgrep \
    vim \
    && ln -s /usr/bin/fdfind /usr/local/bin/fd \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@latest --activate && \
    pnpm install -g @mariozechner/pi-coding-agent

RUN mkdir -p /root/.pi/agent

COPY models.json /root/.pi/agent/models.json

WORKDIR /app

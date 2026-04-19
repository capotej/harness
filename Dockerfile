FROM debian:stable-slim@sha256:e51bfcd2226c480a5416730e0fa2c40df28b0da5ff562fc465202feeef2f1116

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        fd-find \
        gnupg \
        jq \
        ripgrep \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && ln -s /usr/bin/fdfind /usr/local/bin/fd \
    && apt-get purge -y --auto-remove gnupg \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate && \
    pnpm install -g @mariozechner/pi-coding-agent@0.66.1 && \
    pnpm store prune && \
    rm -rf ~/.cache/pnpm ~/.npm

RUN mkdir -p /root/.pi/agent

COPY models.json /root/.pi/agent/models.json

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app
ENTRYPOINT ["/entrypoint.sh"]

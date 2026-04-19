FROM ghcr.io/astral-sh/uv:0.11.6 AS uv_source
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
    pnpm install -g opencode-ai@1.14.18 && \
    pnpm store prune && \
    rm -rf ~/.cache/pnpm ~/.npm

RUN mkdir -p /root/.pi/agent /etc/opencode

COPY models.json /root/.pi/agent/models.json
COPY opencode/lmstudio.json /etc/opencode/lmstudio.json
COPY opencode/openrouter.json /etc/opencode/openrouter.json

COPY --from=uv_source /uv /usr/local/bin/uv
COPY hermes/local.yaml /root/.hermes-local/config.yaml
COPY hermes/openrouter.yaml /root/.hermes-openrouter/config.yaml

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 python3-dev python3-venv build-essential git libffi-dev \
    && git clone --depth 1 --branch v2026.4.16 https://github.com/NousResearch/hermes-agent.git /opt/hermes-agent \
    && cd /opt/hermes-agent \
    && uv venv venv --python python3 \
    && VIRTUAL_ENV=/opt/hermes-agent/venv uv pip install --no-cache-dir -e "." \
    && ln -sf /opt/hermes-agent/venv/bin/hermes /usr/local/bin/hermes \
    && mkdir -p /root/.hermes-local/{sessions,logs,hooks,memories,skills,plans,workspace} \
    && mkdir -p /root/.hermes-openrouter/{sessions,logs,hooks,memories,skills,plans,workspace} \
    && cp /opt/hermes-agent/.env.example /root/.hermes-local/.env \
    && cp /opt/hermes-agent/.env.example /root/.hermes-openrouter/.env \
    && rm -rf /opt/hermes-agent/.git /root/.cache/uv \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app
ENTRYPOINT ["/entrypoint.sh"]

FROM debian:stable-slim@sha256:e51bfcd2226c480a5416730e0fa2c40df28b0da5ff562fc465202feeef2f1116

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG GH_VERSION="2.91.0"
ARG TARGETARCH

# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        fd-find \
        gnupg \
        jq \
        ripgrep \
        sudo \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && ln -s /usr/bin/fdfind /usr/local/bin/fd \
    && apt-get purge -y --auto-remove gnupg \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -s /bin/bash harness \
    && echo 'harness ALL=(root) NOPASSWD: /usr/bin/apt-get, /usr/bin/apt' > /etc/sudoers.d/harness \
    && chmod 0440 /etc/sudoers.d/harness

# Download, verify checksum, and install gh
RUN set -eux && \
    GH_ARCH="linux_${TARGETARCH:-amd64}" && \
    cd /tmp && \
    curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_${GH_ARCH}.tar.gz" \
        -o gh.tar.gz && \
    curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_checksums.txt" \
        -o gh_checksums.txt && \
    grep "gh_${GH_VERSION}_${GH_ARCH}.tar.gz" gh_checksums.txt > gh.checksum && \
    mv gh.tar.gz "gh_${GH_VERSION}_${GH_ARCH}.tar.gz" && \
    sha256sum -c gh.checksum && \
    tar -xzf "gh_${GH_VERSION}_${GH_ARCH}.tar.gz" && \
    mv "gh_${GH_VERSION}_${GH_ARCH}/bin/gh" /usr/local/bin/ && \
    chmod +x /usr/local/bin/gh && \
    rm -rf gh*

ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate && \
    pnpm install -g @mariozechner/pi-coding-agent@0.67.68 && \
    pnpm store prune && \
    rm -rf ~/.cache/pnpm ~/.npm && \
    mkdir -p /etc/harness/pi-defaults && \
    chown -R harness:harness /usr/local/share/pnpm

COPY .npmrc /etc/harness/.npmrc
ENV NPM_CONFIG_GLOBALCONFIG=/etc/harness/.npmrc

COPY pi/models.json /etc/harness/pi-defaults/models.json

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER harness
WORKDIR /app
ENTRYPOINT ["/entrypoint.sh"]

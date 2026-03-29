FROM debian:stable-slim

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g @mariozechner/pi-coding-agent

RUN mkdir -p /root/.pi/agent

COPY models.json /root/.pi/agent/models.json

WORKDIR /app

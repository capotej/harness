# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Harness** is a portable containerized environment for running coding agents. It wraps Docker to execute AI coding agents (currently `pi` and `opencode`) in sandboxed containers, mounting the user's current directory into the container.

## Commands

```bash
pnpm build          # Compile TypeScript → bin/harness.js
make build          # Same via Makefile
make image          # Build Docker image: ghcr.io/capotej/harness
pnpm link --global  # Make `harness` CLI available globally for local testing
pnpm lint           # Run all linters (biome, markdownlint, shellcheck, hadolint, actionlint)
pnpm format         # Auto-format with Biome
```

No test suite is configured. System linters (`shellcheck`, `hadolint`, `actionlint`) must be installed separately (`brew install shellcheck hadolint actionlint`).

## Architecture

All CLI logic lives in `src/harness.ts` (compiles to `bin/harness.js`). It:

1. Parses CLI args via `minimist`
2. Selects an adapter (`PiAdapter` or `OpenCodeAdapter`) based on `--agent` flag
3. Constructs and spawns a `docker run` command that mounts `$PWD` and passes the prompt via stdin or `-e`

**Adapter pattern:** Each adapter implements how to invoke the agent binary inside the container (command, flags, env vars). Adding a new agent means adding a new adapter class and registering it.

**Docker image** (`Dockerfile`): Debian stable-slim with pinned digest, Node.js v24, pnpm, and both agent tools pre-installed (`@mariozechner/pi-coding-agent`, `opencode-ai`).

**`entrypoint.sh`**: Runs inside the container on each invocation — detects provider from env vars (`OPENROUTER_API_KEY`) and configures the active model/provider config accordingly.

**Agent configs:** `models.json` (pi), `opencode/lmstudio.json`, `opencode/openrouter.json` define provider/model settings passed into the container.

## Version Control

This repo uses **jujutsu (`jj`)** for version control (git is the backing store). Use `jj` commands rather than `git` for all VCS operations.

## Rules

- Keep `README.md` updated when changing CLI flags, options, or behavior (from `AGENTS.md`).
- The Docker image is published to `ghcr.io/capotej/harness` via GitHub Actions (`.github/workflows/docker.yml`) on push to `main` and on release tags.
- All dependencies in the Dockerfile MUST be pinned where possible: base images by digest, multi-stage source images by version tag, npm/pnpm packages by exact version, and git-cloned agents by tag or commit SHA.

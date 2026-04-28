# Changelog

## [Unreleased]

### Summary
Fixes a long-standing issue where seeded hermes config files
(`config.yaml`, `.env`, `system-prompt.md`) were never refreshed after the
first container boot — silently breaking the config-as-code workflow for
deployments that mount a persistent volume on `~/.hermes-{local,openrouter}`
(the topology documented in README's fly.io section). Top-level files in
`/etc/harness/hermes-defaults/<flavor>/` are now treated as config and
overwritten on every boot; top-level directories (`sessions/`, `logs/`,
`hooks/`, `memories/`, `skills/`, `plans/`, `workspace/`) remain runtime
state and are preserved across restarts.

### Changes
- fix(hermes): refresh seeded config files on every container boot
- test(hermes): cover seed file-vs-directory semantics in entrypoint-hermes.sh

## [1.5.0] - 2026-04-26

### Summary
Adds `mise` (polyglot version manager) to the base image for in-container language toolchain management, and introduces `tini` as PID 1 across all container variants for proper zombie process reaping and signal forwarding. Expands the e2e test suite with coverage for persistence behavior, `--env-file` forwarding across agents, and CLI documentation completeness.

### Changes
- 0710e24 test(hermes): no -m and no -p emits exactly ['hermes','chat'] (#25)
- ca2f1e3 test(opencode): --env-file is forwarded for non-pi adapters too (#24)
- 4783fa7 test(persist): interactive run without --ephemeral creates .harness/<agent>/ persistence dir (#23)
- 8c0e81b feat: add mise as polyglot version manager to base image (#26)
- a4fd46a test(pi): inverse case  env-file + -m omits --provider ollama (#20)
- 984598e chore: add tini as PID 1 for zombie reaping and signal forwarding (#19)
- d07b6a4 test(cli): assert HARNESS_IMAGE_TAG is documented in --help (#21)

### Dependency Updates
- added `mise` v2026.4.23 (polyglot version manager)
- added `tini` v0.19.0 (PID 1 init process)

## [1.4.6] - 2026-04-26

### Summary
Fixes `--provider ollama` not being forwarded when `-m` is used without `-e` in local mode (e.g. `harness -m "qwen/qwen3.5-9b" -p "..."` now correctly routes to Ollama). Switches the uv cooldown enforcement from a `uv.toml` config file to `--exclude-newer` passed directly to `uv pip install` at image build time — more reliable and removes a footgun. Adds a comprehensive e2e test suite for the CLI. Also ships major upstream updates across all three agents and core dependency bumps.

### Changes
- 7852c25 test: update --model test to reflect --provider ollama in local mode
- f1de7e0 docs: clarify -m model flag works in local mode with HuggingFace IDs
- 359ae3f fix(pi): pass --provider ollama when -m is used without -e
- 7003bf5 fix markdownlint
- 9cb0a47 readme
- b812f27 test: comprehensive e2e tests for the harness CLI (#5)
- bae109d fix: enforce uv cooldown via --exclude-newer flag and add hermes cooldown to check-deps skill (#18)

### Dependency Updates
- updated `debian:stable-slim` base image digest
- updated `pnpm` from 10.33.0 to 10.33.2
- updated `@mariozechner/pi-coding-agent` from 0.67.68 to 0.70.2
- updated `opencode-ai` from 1.14.18 to 1.14.25
- updated `uv` from 0.11.6 to 0.11.7
- updated `hermes-agent` from v2026.4.16 to v2026.4.23

### Upstream Release Notes

#### @mariozechner/pi-coding-agent 0.67.68 → 0.70.2

**v0.68.0** — Configurable streaming working indicator for extensions via `ctx.ui.setWorkingIndicator()`; `before_agent_start` now exposes `systemPromptOptions` so extensions can inspect structured system-prompt inputs.

**v0.68.1** — Added Fireworks provider support with `FIREWORKS_API_KEY` auth and default model `accounts/fireworks/models/kimi-k2p6`; configurable inline tool image width via `terminal.imageWidthCells`.

**v0.69.0** — TypeBox 1.x migration for extensions and SDK; TypeBox-native tool argument validation now works in eval-restricted runtimes (e.g. Cloudflare Workers); stacked extension autocomplete providers via `ctx.ui.addAutocompleteProvider()`.

**v0.70.0** — Searchable fuzzy-filter login flow for `/login` provider selector; GPT-5.5 Codex support (`openai-codex/gpt-5.5`) with `xhigh` reasoning; OSC 9;4 terminal progress indicators are now opt-in.

**v0.70.1** — DeepSeek provider support with V4 Flash/Pro models and `DEEPSEEK_API_KEY`; provider request timeout/retry controls via `retry.provider.{timeoutMs,maxRetries,maxRetryDelayMs}`.

**v0.70.2** — Fixed provider retry/timeout forwarding to omit undefined fields, avoiding downstream SDK validation errors (e.g. `timeout must be an integer`).

#### opencode-ai 1.14.18 → 1.14.25

**v1.14.19** — Fixed circular session schema startup failure; renamed `compaction` setting to `preserve_recent_tokens`; preserved concurrent edits to the same file; added NVIDIA as a built-in provider.

**v1.14.20** — Fixed system theme regression in TUI; added `GET /config` to the experimental HTTP API; fixed permission replies for remote workspaces.

**v1.14.21** — LSP pull diagnostics support (C#, Kotlin); improved session compaction for long threads; C# support switched to Roslyn Language Server; Mistral high-reasoning variant.

**v1.14.22** — Respects `.npmrc` settings during npm installs; projects can store persistent custom icon overrides.

**v1.14.23** — Respects custom `.npmrc` registry settings for package version checks; TUI renders all non-synthetic text in user messages.

**v1.14.24** — Fixed DeepSeek assistant messages (reasoning always included); experimental HTTP API endpoints for MCP server status and file listing/reading.

**v1.14.25** — Fixed permission config to preserve rule order with full IntelliSense for tool permission keys; LSP permission prompts include operation, file, and cursor position; shell commands keep correct working directory after login shell startup; Roslyn LSP support for Razor and `.cshtml` files.

#### hermes-agent v2026.4.16 → v2026.4.23

**v2026.4.23** — Major v0.11.0 release: new Ink-based TUI (`hermes --tui`), native AWS Bedrock support, pluggable transport architecture, 17th messaging platform (QQBot), GPT-5.5 via Codex OAuth, and dramatically expanded plugin surface. Covers ~2 weeks of work (1,556 commits, 761 PRs).

## [1.4.5] - 2026-04-25

### Summary
Enforces a 1-week cooldown on dependency resolution inside the container for both pnpm (`minimumReleaseAge=10080`) and uv (`exclude-newer = "7 days"`), rejecting packages published within the last 7 days to mitigate supply-chain attacks. Also expands the `harness` user's passwordless sudo access to include `dpkg`, surfaces `HARNESS_IMAGE_TAG` in `--help` output, and documents fly.io deployment with `GH_TOKEN`.

### Changes
- 093de49 feat: add dpkg to passwordless sudoers for harness user (#17)
- e064316 feat: enforce 1-week dependency cooldown on pnpm and uv (#15)
- d50d603 docs: surface HARNESS_IMAGE_TAG in --help output (#13)
- 879c9f9 docs: add GH_TOKEN to fly.io setup (#14)
- b1914b3 bump github actions

## [1.4.4] - 2026-04-25

### Summary
Installs `gh` CLI v2.91.0 in the base image with checksum verification for both amd64 and arm64. The PR workflow now builds and tests both architectures natively. Also fixes cosign to exit with an error (rather than a warning) when not installed, and adds fly.io deployment instructions for hermes to the README.

### Dependency Updates
- added `gh` 2.91.0 to base image

### Changes
- f3f4982 Merge pull request #11 from hermclaw/issue/gh-cosign
- 72d45b1 fix: pass TARGETARCH in Makefile for correct gh binary
- 0d967c4 fix: use native arm runner instead of QEMU emulation
- b1c502b feat: build and test both amd64 and arm64 in PR workflow
- 69bf594 fix: rename tarball to match checksum filename for sha256sum -c
- a96ee1e fix: replace cosign verification with checksum verification for gh install
- e201b8b feat: install pinned gh with cosign verification in base Dockerfile
- 090d03e Merge pull request #12 from capotej/pr-build-check
- fddf0b4 add PR build check workflow
- 6a1b803 Merge pull request #9 from hermclaw/fix-cosign-exit-on-missing
- 66d2f08 fix: exit with error if cosign not installed instead of warning
- ae03b50 fix /restart hermes gateway command on fly.io containers
- 4b5eb6f bump github actions
- 3d69bf5 add instructions about deploying hermes to fly.io

## [1.4.3] - 2026-04-23

### Summary
Adds `croniter 6.2.2` to the hermes agent image, enabling cron expression parsing and scheduling support within the hermes environment.

### Dependency Updates
- added `croniter` 6.2.2 to hermes image

### Changes
- e139a0e add croniter to hermes

## [1.4.2] - 2026-04-22

### Summary
Adds `python-telegram-bot 22.7` to the hermes agent image, enabling Telegram bot integration support within the hermes environment.

### Dependency Updates
- added `python-telegram-bot` 22.7 to hermes image

### Changes
- 7a97c2f add python-telegram-bot=22.7 to hermes

## [1.4.1] - 2026-04-22

### Summary
Housekeeping release: adds a LICENSE file, pins the pnpm package manager version, and switches the Dockerfile shell to bash with pipefail — fixing `mkdir` brace expansion failures in the hermes image.

### Changes
- 1c3661a set pnpm version
- 8b9c442 pnpm lint
- eea47e1 add LICENSE

## [1.4.0] - 2026-04-22

### Summary
Interactive runs now persist agent state by default: harness creates a `.harness/<agent>/` directory in your working directory and bind-mounts it into the container, letting agents resume sessions and retain memories across invocations. One-shot runs (`-p "..."` or piped stdin) remain implicitly ephemeral; use `--ephemeral` to force-disable persistence for interactive runs. Image signature verification results are now cached per digest to avoid redundant cosign checks on repeated invocations.

### Changes
- fef0a0b cache the image signature verification per digest
- 2f56b75 persist agent data by default in .harness, --ephemeral to opt out

## [1.3.3] - 2026-04-21

### Summary
The hermes sub-image now includes [`tirith`](https://github.com/sheeki03/tirith) v0.2.12 and adds full cosign attestation verification for the `uv` binary at build time. The README documents the `HARNESS_IMAGE_TAG` environment variable for overriding the Docker image tag.

### Dependency Updates
- added `tirith` 0.2.12 to hermes image
- added cosign attestation verification for `uv` in hermes image

### Changes
- fcb209d verify uv and cosign
- ae3c7da install tirith in hermes image

## [1.3.2] - 2026-04-19

### Summary
The container now runs as a dedicated non-root `harness` user for improved security. Image verification is enabled by default on startup (skip with `--no-verify`). Updated `@mariozechner/pi-coding-agent` to 0.67.68.

### Dependency Updates
- updated `@mariozechner/pi-coding-agent` from 0.66.1 to 0.67.68

### Changes
- 870b6c3 rootless containers
- 4c746f6 get rid of --sh
- 80bb880 enable verification by default
- 008cf77 prepare for immutable releases

## [1.3.1] - 2026-04-19

### Summary
Adds build provenance attestation to the CI pipeline for improved supply chain security.

### Changes
- ad23df9 attest build provenance

## [1.3.0] - 2026-04-19

### Summary
Agent backends (`opencode`, `hermes`) have been split into separate sub-images that are dynamically loaded at runtime, keeping the base image lean. Image verification on startup is now supported (experimental, opt-in via `HARNESS_VERIFY=1`): harness checks that the container image was signed by the official CI workflow using cosign before running. Disable with `--no-verify`.

### Dependency Updates
- removed `opencode-ai@1.14.18` from base image (moved to subimage)
- removed `uv@0.11.6` and `hermes-agent@v2026.4.16` from base image (moved to subimage)

### Changes
- 5b7c4fe split up agents into subimages, dynamically load them
- 79542cd verify harness image on start (experimental, behind HARNESS_VERIFY=1)

## [1.2.0] - 2026-04-19

### Summary
Adds the [`hermes`](https://github.com/NousResearch/hermes-agent) agent backend by NousResearch. The Docker image was also optimized by removing unused packages (`vim`, `iputils-ping`) and cleaning up caches to reduce image size.

### Dependency Updates
- added `uv` 0.11.6 (build stage for hermes installation)
- added `hermes-agent` v2026.4.16

### Changes
- 63fef70 pin harness image
- f385189 hermes agent
- d021dbc optimize docker image, skill to analyze image
- be45fa8 /release skill

## [1.1.1] - 2026-04-19

### Changes
- 40398b2 support -f/--file to mount only a single file
- 76cd70d context files
- 0951e12 pin image and bump to 1.1.0
- 95cdb21 opencode adapter
- 84aaebe switch to adapters for agents
- bee4bfe switch to typescript
- cdd8240 bump package version
- 73ce639 readme
- 32ddde2 readme
- 0b5094e readme
- 3dd38fc update logo to be transparent
- 5249065 readme updates
- bf1006b update README with logo, update package visibility in package.json

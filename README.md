<p align="center" style="margin-bottom: 0">
  <img src="logo.png" alt="harness" width="500" />
</p>

<p align="center">
  <strong>Run agents in a sandboxed container — ready to drop into any project.</strong>
</p>

Harness conveniently wraps Docker around three open-source coding agents — [`pi`](https://pi.dev/), [`opencode`](https://opencode.ai), 
and [`hermes`](https://github.com/NousResearch/hermes-agent) — so you can point one at a directory (or file) without giving it access to your entire machine. 

## Features

- **Sandboxed by default** — capability-dropped container with `no-new-privileges`; the agent only sees the directory (or file) you mount.
- **Three agents, one CLI** — switch between `pi`, `opencode`, and `hermes` with `-a`. Same flags, same flow.
- **Supply-chain hardened** — the image is signed and verified with cosign and SLSA provenance on every run; dependencies installed inside the container are always pinned and verified where possible and a 7-day "cooldown" is used to mitigate supply-chain attacks.
- **Local-first** — defaults to LM Studio with `gemma-4-e4b`. Drop in an `--env-file` to use Anthropic, OpenRouter, OpenAI, Gemini, and others.
- **Stateful or one-shot** — interactive runs persist agent state under `.harness/<agent>/`; one-shot prompts (`-p` or piped stdin) stay ephemeral.
- **Zero install** — `npx @capotej/harness` just works.

## Quickstart

[Docker](https://www.docker.com) is required. By default, harness uses LM Studio locally:

```bash
lms daemon up
lms get google/gemma-4-e4b
```

Then `cd` into any project and run:

```bash
npx @capotej/harness -p "write me a fizzbuzz in Go"
```

That's it. Your current directory is mounted at `/workspace` inside the container and the agent works against it.

## Contents

- [Examples](#examples)
- [Agents](#agents)
  - [pi (default)](#pi-default)
  - [opencode](#opencode)
  - [hermes](#hermes)
- [Security model](#security-model)
  - [Sandbox](#sandbox)
  - [Image verification](#image-verification)
  - [Dependency cooldown](#dependency-cooldown)
- [Persistence](#persistence)
- [Reference](#reference)
  - [CLI flags](#cli-flags)
  - [Environment variables](#environment-variables)
  - [Agent-specific behavior](#agent-specific-behavior)
- [Deploying hermes as a fly.io "claw"](#deploying-hermes-as-a-flyio-claw)
- [Developing](#developing)

## Examples

```bash
# One-shot prompt
npx @capotej/harness -p "write me a fizzbuzz in Go"

# Pipe via stdin
echo "write me a fizzbuzz in Go" | npx @capotej/harness

# Interactive session (no -p, no piped stdin) — state persists under .harness/
npx @capotej/harness

# Use a cloud provider via env file
npx @capotej/harness -e .env -p "add a login endpoint"

# Override the model
npx @capotej/harness -m anthropic/claude-sonnet-4-5 -p "refactor the auth module"

# Mount a single file instead of the whole directory
npx @capotej/harness -f ./script.py -p "add type hints"

# Switch agents
npx @capotej/harness -a opencode -p "write me a fizzbuzz in Go"
npx @capotej/harness -a hermes -e .env -p "add tests"
```

`npx`, `bunx`, and `pnpm dlx` are interchangeable. Or install globally:

```bash
npm install -g @capotej/harness
# or
pnpm add -g @capotej/harness
# or
bun add -g @capotej/harness
```

## Agents

Pick an agent with `-a`. Default is `pi`.

### pi (default)

[`pi`](https://pi.dev/) defaults to LM Studio with `google/gemma-4-e4b` (16k context is enough). Pass an `--env-file` containing any of the keys below and `pi` switches to that provider:

| Provider      | Environment Variable |
|---------------|----------------------|
| Anthropic     | `ANTHROPIC_API_KEY`  |
| OpenRouter    | `OPENROUTER_API_KEY` |
| OpenAI        | `OPENAI_API_KEY`     |
| Google Gemini | `GEMINI_API_KEY`     |
| Mistral       | `MISTRAL_API_KEY`    |
| Groq          | `GROQ_API_KEY`       |
| Cerebras      | `CEREBRAS_API_KEY`   |
| xAI           | `XAI_API_KEY`        |
| Hugging Face  | `HF_TOKEN`           |

See the [full provider list](https://github.com/badlogic/pi-mono/blob/c779c14e91bc2ea65143e59b0dc1baf3646ba8c9/packages/coding-agent/docs/providers.md#api-keys). The `-m` flag is forwarded directly.

### opencode

[`opencode`](https://opencode.ai) defaults to LM Studio. Drop `OPENROUTER_API_KEY` into your env file and it switches to OpenRouter automatically (`openrouter/auto` if no `-m`). The `-m` flag takes a bare model name; the provider prefix is added for you.

```bash
npx @capotej/harness -a opencode -e .env -p "refactor the auth module"
npx @capotej/harness -a opencode -e .env -m anthropic/claude-sonnet-4-5 -p "add tests"
```

When using LM Studio locally, set the model's context length to at least 32k tokens.

### hermes

[`hermes`](https://github.com/NousResearch/hermes-agent) by NousResearch supports many providers. Pass an env file with your key and a `provider/model` to `-m`:

```bash
npx @capotej/harness -a hermes -e .env -m anthropic/claude-sonnet-4-5 -p "add tests"
npx @capotej/harness -a hermes -e .env -m openrouter/auto -p "add tests"
```

Common keys: `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, [and others](https://github.com/NousResearch/hermes-agent/blob/main/.env.example). LM Studio context length should be at least 64k tokens.

## Security model

Harness layers protections at runtime, image, and dependency level.

### Sandbox

Each run starts the container with:

- `--cap-drop=ALL --cap-add=NET_RAW` — minimal capability set
- `--security-opt no-new-privileges:true` — block privilege escalation
- Only your mounted directory (or single file with `-f`) is visible to the agent

### Image verification

By default, harness verifies that the container image was signed by the official CI workflow and carries a valid SLSA provenance attestation. This requires [cosign](https://github.com/sigstore/cosign):

```bash
brew install cosign
```

Verified digests are cached at `~/.cache/harness/cosign-verified.json` so verification only runs once per image. Skip with `--no-verify` (or by setting `HARNESS_IMAGE_TAG`, which implies skip):

```bash
npx @capotej/harness --no-verify -p "write me a fizzbuzz in Go"
```

### Dependency cooldown

When an agent runs `pnpm install` or `uv pip install` inside the container, any package published in the last 7 days is rejected — a guard against supply-chain compromises that are typically discovered and yanked within hours.

- **pnpm**: `minimumReleaseAge=10080` (minutes) via `.npmrc`
- **uv**: `--exclude-newer` set to 7 days ago at image build time

The cooldown applies to transitive dependencies too. Older packages install normally.

## Persistence

Interactive runs (no `-p` and no piped stdin) bind-mount `.harness/<agent>/` from your working directory into the container. This lets agents resume sessions, skip database migrations on repeat runs, and retain memories across invocations.

One-shot runs (`-p` or piped stdin) are implicitly ephemeral — no `.harness/` directory is created. Use `--ephemeral` to force-disable persistence on interactive runs.

Add `.harness/` to your `.gitignore`.

## Reference

### CLI flags

| Flag          | Alias | Description |
|---------------|-------|-------------|
| `--prompt`    | `-p`  | Pass a prompt directly to the agent |
| `--env-file`  | `-e`  | Load environment variables into the container |
| `--file`      | `-f`  | Mount a single file instead of the current directory |
| `--model`     | `-m`  | Override the model used by the agent |
| `--agent`     | `-a`  | Select agent: `pi`, `opencode`, `hermes` (default: `pi`) |
| `--no-verify` |       | Skip cosign signature and provenance verification |
| `--ephemeral` |       | Disable session persistence (implied by `-p` and piped stdin) |
| `--help`      | `-h`  | Show help |

### Environment variables

| Variable             | Description |
|----------------------|-------------|
| `HARNESS_IMAGE_TAG`  | Override the Docker image tag (defaults to the package version). Setting this implies `--no-verify`. |

### Agent-specific behavior

- **pi** — `-m` is passed straight to the binary as `--model`.
- **opencode** — `-m` is passed via the `OPENCODE_MODEL` env var. Provider is auto-detected from the env file (`OPENROUTER_API_KEY` → OpenRouter, otherwise LM Studio).
- **hermes** — `-m` is passed as `--model` in `provider/model` form. Provider is auto-detected from whichever API key is present.

## Deploying hermes as a fly.io "claw"

You can deploy `hermes` as a long-running "claw" on [fly.io](https://fly.io), reachable over a messaging gateway. These instructions assume Telegram; adapt for other [messaging gateways](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/).

Install and authenticate `flyctl`:

```bash
brew install flyctl
fly auth login
```

Create `fly.toml`:

```toml
app = "my-hermes-agent-claw"
primary_region = "iad"

[env]
  TZ = "America/New_York"

[build]
  image = "ghcr.io/capotej/harness:hermes-1.4.5"

[processes]
  app = "hermes gateway"

[[mounts]]
  source = "my_hermes_agent_claw_data"
  destination = "/home/harness/.hermes-openrouter"
  initial_size = "1gb"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"

[[restart]]
  policy = "always"
  max_retries = 3
```

Create the app, volume, and secrets, then deploy:

```bash
fly apps create my-hermes-agent-claw
fly volumes create my_hermes_agent_claw_data --region iad --size 1 --app my-hermes-agent-claw
fly secrets set OPENROUTER_API_KEY=<your-key> --app my-hermes-agent-claw
# https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram#option-b-manual-configuration
fly secrets set TELEGRAM_BOT_TOKEN=<your-token> --app my-hermes-agent-claw
fly secrets set TELEGRAM_ALLOWED_USERS=<your-user-ids> --app my-hermes-agent-claw
fly secrets set GH_TOKEN=<your-personal-access-token> --app my-hermes-agent-claw
fly deploy --app my-hermes-agent-claw
```

> **GitHub CLI access:** The `GH_TOKEN` secret makes the `gh` CLI available inside the container. Tell the agent to add `terminal.env_passthrough: [GH_TOKEN]` to its `config.yaml` so the token is accessible in the sandbox.

Message the bot via Telegram, or wire it up to a scheduled workflow — see the [daily briefing bot guide](https://hermes-agent.nousresearch.com/docs/guides/daily-briefing-bot) for an example.

## Developing

Link your local checkout globally:

```bash
pnpm link --global
# unlink with:
pnpm unlink --global @capotej/harness
```

### Building the image

```bash
make image
```

Builds `ghcr.io/capotej/harness` with Debian stable-slim, Node.js v24, [`@mariozechner/pi-coding-agent`](https://pi.dev/), [`opencode-ai`](https://opencode.ai), [`hermes-agent`](https://github.com/NousResearch/hermes-agent), `fd`, `ripgrep`, `jq`, and `curl`.

The base image is pinned by manifest-list digest (the OCI image index, not a per-platform manifest) for reproducible multi-arch builds. To bump it:

```bash
docker buildx imagetools inspect debian:stable-slim --format '{{.Manifest.Digest}}'
```

### Linting

```bash
pnpm lint           # all
pnpm lint:ts        # Biome
pnpm lint:md        # markdownlint
pnpm lint:sh        # shellcheck
pnpm lint:docker    # hadolint
pnpm lint:actions   # actionlint
pnpm format         # auto-format with Biome
```

`shellcheck`, `hadolint`, and `actionlint` are system binaries:

```bash
brew install shellcheck hadolint actionlint
```

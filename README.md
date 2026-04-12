<p align="center" style="margin-bottom: 0">
  <img src="logo.png" alt="harness" width="500" />
</p>

Easily spin up a sandboxed agent within a directory. Currently uses [`pi`](https://pi.dev/) as the agent, but may change in the future as the landscape evolves.

## Usage

```bash
# Run the agent with a prompt
npx @capotej/harness -p "write me a fizzbuzz in Go"

# Pipe a prompt via stdin
echo "write me a fizzbuzz in Go" | npx @capotej/harness

# Pass an env file (e.g. for API keys)
npx @capotej/harness -e .env

# Combine flags
npx @capotej/harness -e .env -p "add a login endpoint"

# Use a specific model
npx @capotej/harness -m anthropic/claude-sonnet-4-5 -p "refactor the auth module"

# Open a shell for manual exploration
npx @capotej/harness -s
```

You can also install globally and use the `harness` command directly:

```bash
npm install -g @capotej/harness
# or
pnpm add -g @capotej/harness
# or
bun add -g @capotej/harness
```

All examples use `npx`, but `bunx` and `pnpm dlx` work as drop-in replacements:

```bash
bunx @capotej/harness -p "write me a fizzbuzz in Go"
pnpm dlx @capotej/harness -p "write me a fizzbuzz in Go"
```

## Prerequisites

[Docker](https://www.docker.com) is required to run the container.

To use local models, [LM Studio](https://lmstudio.ai) or [Ollama](https://ollama.com) is also required. For LM Studio, start the daemon and pull the default model:

```bash
lms daemon up
lms get google/gemma-4-e4b
```

The container is preconfigured to use `gemma-4-e4b` by default via LM Studio's local API.

### Using a cloud provider instead

If you pass an API key for a supported provider via `--env-file`, [`pi`](https://pi.dev/) will use that provider instead of the local LM Studio setup. Supported keys:

| Provider | Environment Variable |
|----------|----------------------|
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Cerebras | `CEREBRAS_API_KEY` |
| xAI | `XAI_API_KEY` |
| Hugging Face | `HF_TOKEN` |

See the [full list of supported providers](https://github.com/badlogic/pi-mono/blob/c779c14e91bc2ea65143e59b0dc1baf3646ba8c9/packages/coding-agent/docs/providers.md#api-keys) for more options.

```bash
# Example: run with Anthropic instead of local models
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npx @capotej/harness -e .env -p "refactor the auth module"
```

## Developing

```bash
pnpm link --global
```

This makes the `harness` command available globally from your local checkout. To remove it:

```bash
pnpm unlink --global @capotej/harness
```

## Building

```bash
make image
```

Builds the `capotej/harness` Docker image with:
- Debian stable-slim
- Node.js v24
- [`@mariozechner/pi-coding-agent`](https://pi.dev/) globally installed via pnpm
- `fd`, `ripgrep`, `jq`, `vim`, `curl`, `iputils-ping`

### Base image pinning

The `Dockerfile` pins the base image by digest rather than tag to ensure reproducible builds. The digest used is the **manifest list** (OCI image index), not a per-platform manifest. This is important for multi-arch support: a manifest list digest resolves to the correct platform-specific image at build time, whereas pinning a per-platform digest causes a platform mismatch warning when building on a different architecture.

To update the base image, fetch the manifest list digest and update `Dockerfile`:

```bash
docker buildx imagetools inspect debian:stable-slim --format '{{.Manifest.Digest}}'
```

## Running

Navigate to any project directory and run:

```bash
npx @capotej/harness
```

Or, if you've linked the package locally:

```bash
harness
```

This will:
- Start a container from the `capotej/harness` image
- Mount your current directory as `/workspace` inside the container
- Run the [`pi` coding agent](https://pi.dev/) in the container

## Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--prompt` | `-p` | Pass a prompt directly to the coding agent |
| `--env-file` | `-e` | Load environment variables from a file into the container |
| `--model` | `-m` | Override the model used by the agent |
| `--sh` | `-s` | Open an interactive bash shell instead of running the agent |

You can also pipe text to `npx @capotej/harness` as an implied `-p`:

```bash
echo "write me a fizzbuzz in Go" | npx @capotej/harness
```

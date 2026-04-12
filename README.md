# @capotej/harness

A portable environment for running coding agents in a container in any project.

## Building

```bash
make image
```

Builds the `capotej/harness` Docker image with:
- Debian stable-slim
- Node.js v20
- @mariozechner/pi-coding-agent globally installed

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
- Run the `pi` coding agent in the container
- Your workspace is preconfigured with all the tools needed for coding agents

## Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--prompt` | `-p` | Pass a prompt directly to the coding agent |
| `--env-file` | `-e` | Load environment variables from a file into the container |
| `--sh` | `-s` | Open an interactive bash shell instead of running the agent |

### Examples

```bash
# Run the agent with a prompt
harness -p "write me a fizzbuzz in Go"

# Pass an env file (e.g. for API keys)
harness -e .env

# Combine flags
harness -e .env -p "add a login endpoint"

# Open a shell for manual exploration
harness -s
```

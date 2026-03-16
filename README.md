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
- Drop you into a bash shell in the container
- Your workspace is preconfigured with all the tools needed for coding agents

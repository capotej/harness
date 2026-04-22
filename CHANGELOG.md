# Changelog

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

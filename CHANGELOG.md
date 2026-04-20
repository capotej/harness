# Changelog

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

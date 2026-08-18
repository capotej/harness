#!/bin/bash
set -e

# Shared env setup (routes git's global config into persisted ~/.config).
# shellcheck disable=SC1091
. /etc/harness/setup-env.sh

CONFIG="/home/harness/.hermes/config.yaml"
HERMES_HOME="/home/harness/.hermes"

# Stamp docker install so Hermes skips in-container update banners (#100).
mkdir -p "$HERMES_HOME"
printf '%s\n' docker >"$HERMES_HOME/.install_method"

if [ ! -f "$CONFIG" ]; then
	# First run
	if [ -z "$HARNESS_CLOUD_MODE" ]; then
		# Local mode: seed LM Studio config
		mkdir -p /home/harness/.hermes
		cp /etc/harness/hermes-local.yaml "$CONFIG"
	fi
	# Cloud mode first run: hermes self-seeds from env vars
	# Default skills marketplace (#163) — idempotent; public repo, no credentials
	hermes skills tap add boldblackai/skills >/dev/null 2>&1 || true
else
	# Config exists — reconcile with current harness mode
	if [ -z "$HARNESS_CLOUD_MODE" ]; then
		# Local mode: ensure LM Studio settings
		hermes config set model.provider custom >/dev/null 2>&1
		hermes config set model.base_url "http://host.docker.internal:1234/v1" >/dev/null 2>&1
		hermes config set model.default "${HERMES_MODEL:-gemma-4-e4b}" >/dev/null 2>&1
	else
		# Cloud mode: honor HERMES_PROVIDER/HERMES_BASE_URL when set; else hermes auto-detects (#132)
		hermes config set model.provider "${HERMES_PROVIDER:-}" >/dev/null 2>&1
		hermes config set model.base_url "${HERMES_BASE_URL:-}" >/dev/null 2>&1
	fi
fi

# Override model if -m was passed
if [ -n "$HERMES_MODEL" ]; then
	hermes config set model.default "$HERMES_MODEL" >/dev/null 2>&1
fi

exec "$@"

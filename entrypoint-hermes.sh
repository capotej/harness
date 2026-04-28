#!/bin/bash
set -e

# Seed source/destination paths can be overridden for testing. The defaults
# match the layout baked into Dockerfile.hermes.
: "${HERMES_SEED_SRC_LOCAL:=/etc/harness/hermes-defaults/local}"
: "${HERMES_SEED_SRC_OPENROUTER:=/etc/harness/hermes-defaults/openrouter}"
: "${HERMES_SEED_DST_LOCAL:=/home/harness/.hermes-local}"
: "${HERMES_SEED_DST_OPENROUTER:=/home/harness/.hermes-openrouter}"

# seed copies the image's hermes defaults into the runtime hermes home dir.
#
# Top-level *files* (config.yaml, .env, system-prompt.md, ...) are treated as
# config-as-code and refreshed from the image on every boot — so a downstream
# image rebuild that updates these files actually takes effect, even when the
# destination is a persistent volume (the topology documented in README's
# fly.io section).
#
# Top-level *directories* (sessions/, logs/, hooks/, memories/, skills/,
# plans/, workspace/) are runtime state — initialized once on first boot,
# then preserved across container restarts.
seed() {
  local src="$1"
  local dst="$2"
  [ -d "$src" ] || return 0
  mkdir -p "$dst"

  # Include hidden files (.env) and skip empty globs cleanly.
  shopt -s nullglob dotglob
  local entry name
  for entry in "$src"/*; do
    name="$(basename "$entry")"
    case "$name" in . | ..) continue ;; esac
    if [ -f "$entry" ]; then
      cp "$entry" "$dst/$name"
    elif [ -d "$entry" ] && [ ! -d "$dst/$name" ]; then
      cp -r "$entry" "$dst/$name"
    fi
  done
  shopt -u nullglob dotglob
}

seed "$HERMES_SEED_SRC_LOCAL"      "$HERMES_SEED_DST_LOCAL"
seed "$HERMES_SEED_SRC_OPENROUTER" "$HERMES_SEED_DST_OPENROUTER"

if [ -n "$OPENROUTER_API_KEY" ]; then
  export HERMES_HOME="$HERMES_SEED_DST_OPENROUTER"
else
  export HERMES_HOME="$HERMES_SEED_DST_LOCAL"
fi

exec "$@"

#!/bin/bash
set -e

echo "harness: pnpm minimumReleaseAge=$(grep minimumReleaseAge /etc/harness/.npmrc 2>/dev/null | cut -d= -f2 || echo disabled) min, uv exclude-newer=$(grep exclude-newer /etc/harness/uv.toml 2>/dev/null | cut -d'"' -f2 || echo disabled)"

seed() {
  [ -d "$1" ] || return 0
  mkdir -p "$2"
  cp -rn "$1"/. "$2"/
}

seed /etc/harness/hermes-defaults/local /home/harness/.hermes-local
seed /etc/harness/hermes-defaults/openrouter /home/harness/.hermes-openrouter

if [ -n "$OPENROUTER_API_KEY" ]; then
  export HERMES_HOME=/home/harness/.hermes-openrouter
else
  export HERMES_HOME=/home/harness/.hermes-local
fi

exec "$@"

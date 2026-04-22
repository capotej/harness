#!/bin/bash
set -e

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

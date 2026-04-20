#!/bin/bash
set -e

if [ -n "$OPENROUTER_API_KEY" ]; then
  export HERMES_HOME=/home/harness/.hermes-openrouter
else
  export HERMES_HOME=/home/harness/.hermes-local
fi

exec "$@"

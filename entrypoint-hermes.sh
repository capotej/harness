#!/bin/bash
set -e

if [ -n "$OPENROUTER_API_KEY" ]; then
  export HERMES_HOME=/root/.hermes-openrouter
else
  export HERMES_HOME=/root/.hermes-local
fi

exec "$@"

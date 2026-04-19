#!/bin/bash
set -e

export OPENCODE_DISABLE_AUTOUPDATE=true
export OPENCODE_DISABLE_PRUNE=true


if [ -n "$OPENROUTER_API_KEY" ]; then
  export OPENCODE_CONFIG=/etc/opencode/openrouter.json
  export OPENCODE_MODEL="openrouter/${OPENCODE_MODEL:-openrouter/auto}"
else
  export OPENCODE_CONFIG=/etc/opencode/lmstudio.json
  export OPENCODE_MODEL="${OPENCODE_MODEL:-lmstudio/google/gemma-4-e4b}"
fi

exec "$@"

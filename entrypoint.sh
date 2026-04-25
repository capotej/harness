#!/bin/bash
set -e

seed() {
  [ -d "$1" ] || return 0
  mkdir -p "$2"
  cp -rn "$1"/. "$2"/
}

seed /etc/harness/pi-defaults /home/harness/.pi/agent

echo "harness: pnpm minimumReleaseAge=$(grep minimumReleaseAge /etc/harness/.npmrc 2>/dev/null | cut -d= -f2 || echo disabled) min"

exec "$@"

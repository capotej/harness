#!/bin/bash
set -e

seed() {
  [ -d "$1" ] || return 0
  mkdir -p "$2"
  cp -rn "$1"/. "$2"/
}

seed /etc/harness/pi-defaults /home/harness/.pi/agent

exec "$@"

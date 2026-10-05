#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
binary="$(mktemp)"
trap 'rm -f "$binary"' EXIT
cc -std=c11 -Wall -Wextra -Werror -Itests -Iproject/Core/Inc tests/traffic_light_test.c -o "$binary"
"$binary"

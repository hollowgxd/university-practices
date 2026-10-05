#!/usr/bin/env bash
set -Eeuo pipefail
BASE_URL="${BASE_URL:-http://localhost:8081}"

check() {
  local path="$1" body status
  body="$(curl --fail-with-body --silent --show-error --write-out $'\n%{http_code}' "${BASE_URL}${path}")"
  status="${body##*$'\n'}"
  body="${body%$'\n'*}"
  test "$status" = 200 || { echo "${path}: expected HTTP 200, got ${status}" >&2; exit 1; }
  printf '%s: HTTP %s\n' "$path" "$status"
  printf '%s\n' "$body" | jq -e . >/dev/null
}

check /health
check /last
check /iss/trend
check /osdr/list
check /space/summary
check "/space/apod/latest"
echo "acceptance checks passed"

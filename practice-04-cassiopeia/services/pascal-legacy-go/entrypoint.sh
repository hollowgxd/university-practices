#!/usr/bin/env sh
set -eu
period="${GEN_PERIOD_SEC:-300}"
echo "[legacy-go] contract=telemetry_csv interval=${period}s"
while :; do
  if /usr/local/bin/pascal-legacy-go; then
    echo "[legacy-go] generation completed"
  else
    rc=$?
    echo "[legacy-go] generation failed rc=${rc}" >&2
  fi
  sleep "$period"
done

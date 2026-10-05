#!/usr/bin/env bash
set -Eeuo pipefail
period="${GEN_PERIOD_SEC:-300}"
echo "[legacy] contract=telemetry_csv interval=${period}s" >&1
while true; do
  if /app/legacy; then
    echo "[legacy] generation completed" >&1
  else
    rc=$?
    echo "[legacy] generation failed rc=${rc}" >&2
  fi
  sleep "$period"
done

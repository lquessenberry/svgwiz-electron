#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/app/share/svgwiz"
ELECTRON_BIN="/app/bin/electron"
ZYPK_WRAPPER="/app/bin/zypak-wrapper"

# Ensure runtime tmpdir is set
export TMPDIR="${XDG_RUNTIME_DIR}/app/${FLATPAK_ID:-com.example.svgwiz}"

if [ -x "$ZYPK_WRAPPER" ]; then
  exec "$ZYPK_WRAPPER" "$ELECTRON_BIN" "$APP_DIR" "$@"
else
  exec "$ELECTRON_BIN" "$APP_DIR" "$@"
fi

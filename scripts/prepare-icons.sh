#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/prepare-icons.sh /path/to/source-icon.(png|svg)
# Requires: ImageMagick (convert or magick). Optional: png2icns for macOS icns generation.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/source-icon.(png|svg)" >&2
  exit 1
fi

SRC=$1
if [[ ! -f "$SRC" ]]; then
  echo "Source icon not found: $SRC" >&2
  exit 1
fi

# Detect ImageMagick command
if command -v magick >/dev/null 2>&1; then
  IM_CMD=(magick)
elif command -v convert >/dev/null 2>&1; then
  IM_CMD=(convert)
else
  echo "ImageMagick not found. Install it (e.g., sudo apt install imagemagick)" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="$ROOT_DIR/assets/icons"
BUILD_DIR="$ROOT_DIR/build"
TMP_DIR="$ROOT_DIR/.tmp-icons"

mkdir -p "$ASSETS_DIR" "$BUILD_DIR" "$TMP_DIR"

# Common options to ensure proper transparency and color handling for PNGs
# -background none: transparent canvas
# -alpha on: ensure alpha channel is enabled
# -define png:color-type=6: enforce RGBA output
# -colorspace sRGB: consistent colors across platforms
# -strip: remove extraneous metadata
IM_SVG_TO_PNG_ARGS=(
  -background none
  -alpha on
  -define png:color-type=6
  -colorspace sRGB
  -strip
)

# Generate sizes
# Flatpak expects a 256x256 PNG; electron-builder prefers a 512x512 PNG for Linux
FLATPAK_PNG="$ASSETS_DIR/icon.png"
LINUX_PNG="$BUILD_DIR/icon.png"
WIN_ICO="$BUILD_DIR/icon.ico"
MAC_ICNS="$BUILD_DIR/icon.icns"

# Create base PNGs (apply transparency args BEFORE -extent to keep alpha in canvas fill)
"${IM_CMD[@]}" "$SRC" "${IM_SVG_TO_PNG_ARGS[@]}" -resize 256x256 -gravity center -extent 256x256 "$FLATPAK_PNG"
"${IM_CMD[@]}" "$SRC" "${IM_SVG_TO_PNG_ARGS[@]}" -resize 512x512 -gravity center -extent 512x512 "$LINUX_PNG"

# Windows ICO (multi-res)
ICO_SIZES=(16 24 32 48 64 128 256)
ICO_INPUTS=()
for S in "${ICO_SIZES[@]}"; do
  OUT="$TMP_DIR/icon-${S}.png"
  "${IM_CMD[@]}" "$SRC" "${IM_SVG_TO_PNG_ARGS[@]}" -resize ${S}x${S} -gravity center -extent ${S}x${S} "$OUT"
  ICO_INPUTS+=("$OUT")
done
"${IM_CMD[@]}" "${ICO_INPUTS[@]}" "$WIN_ICO"

# macOS ICNS (optional)
if command -v png2icns >/dev/null 2>&1; then
  ICONSET_DIR="$TMP_DIR/icon.iconset"
  mkdir -p "$ICONSET_DIR"
  for S in 16 32 64 128 256 512 1024; do
    OUT="$ICONSET_DIR/icon_${S}x${S}.png"
    "${IM_CMD[@]}" "$SRC" -resize ${S}x${S} -background none -gravity center -extent ${S}x${S} "$OUT"
  done
  # png2icns expects a list of PNGs; using the largest usually works
  png2icns "$MAC_ICNS" "$ICONSET_DIR"/*.png >/dev/null 2>&1 || true
else
  echo "png2icns not found. Skipping macOS .icns generation. (Optional)" >&2
fi

rm -rf "$TMP_DIR"

echo "Icons generated:"
echo "  Flatpak: $FLATPAK_PNG"
echo "  Linux  : $LINUX_PNG"
echo "  Windows: $WIN_ICO"
if [[ -f "$MAC_ICNS" ]]; then
  echo "  macOS  : $MAC_ICNS"
else
  echo "  macOS  : skipped"
fi

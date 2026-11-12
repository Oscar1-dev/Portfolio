#!/usr/bin/env bash
# Render the brand cards (card.html) to PNG with headless Edge or Chrome,
# so they use the site's real fonts. Needs the hero frames in media-src/render.
set -euo pipefail
cd "$(dirname "$0")"
BROWSER="${BROWSER:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
URL="file:///$(pwd -W 2>/dev/null || pwd)/card.html"
OUT=../../public
shot() { # kind width height file
  "$BROWSER" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=4000 \
    --window-size="$2,$3" --screenshot="$(pwd -W 2>/dev/null || pwd)/$4" "$URL?kind=$1" >/dev/null 2>&1
  echo "rendered $4"
}
shot og 1200 630 "$OUT/og.png"
shot banner 1500 500 "$OUT/brand/banner.png"
shot lockup-dark 1600 520 "$OUT/brand/logo-dark.png"
shot lockup-light 1600 520 "$OUT/brand/logo-light.png"

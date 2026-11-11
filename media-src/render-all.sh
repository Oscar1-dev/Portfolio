#!/usr/bin/env bash
# Unattended media pipeline: render every scene (resumable: finished frames are
# skipped), encode the videos and posters, then build the brand files.
#   bash media-src/render-all.sh            # everything
#   bash media-src/render-all.sh --wait     # first wait for Blender jobs already running
# Log: media-src/render/pipeline.log
set -uo pipefail
cd "$(dirname "$0")/.."
BLENDER="${BLENDER:-/c/Program Files/Blender Foundation/Blender 5.2/blender.exe}"
mkdir -p media-src/render
exec >> media-src/render/pipeline.log 2>&1
echo "=== pipeline start $(date) ==="
if [ "${1:-}" = "--wait" ]; then
  while tasklist 2>/dev/null | grep -qi blender.exe; do sleep 30; done
  echo "earlier Blender jobs finished $(date)"
fi
for s in hero_teardown security_layers projects_tray contact_gate about_deck experience_rail brand_disc; do
  echo "--- $s $(date)"
  "$BLENDER" -b -P media-src/blender/$s.py -- --save > media-src/render/$s.log 2>&1 || echo "FAILED $s"
  echo "$s frames: $(ls media-src/render/$s 2>/dev/null | wc -l)"
done
bash media-src/encode.sh || echo "FAILED encode"
# animated logo loop
if [ -f media-src/render/brand_disc/0120.png ]; then
  ffmpeg -y -loglevel error -framerate 30 -i media-src/render/brand_disc/%04d.png -vf "scale=720:-2,format=yuv420p" -an -c:v libvpx-vp9 -crf 34 -b:v 0 public/brand/mark-loop.webm
  ffmpeg -y -loglevel error -framerate 30 -i media-src/render/brand_disc/%04d.png -vf "scale=720:-2,format=yuv420p" -an -c:v libx264 -crf 24 -preset slow -movflags +faststart public/brand/mark-loop.mp4
fi
node media-src/brand/build.mjs || echo "FAILED brand build"
bash media-src/brand/render-cards.sh || echo "FAILED cards"
echo "=== pipeline done $(date) ==="

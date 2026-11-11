#!/usr/bin/env bash
# Turn rendered PNG frames (media-src/render/<scene>/0001.png …) into the
# web assets in public/media/. Usage: bash media-src/encode.sh [scene …]
# Needs ffmpeg on PATH. Safe to re-run; it overwrites its own output.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/media
mkdir -p "$OUT"
#        scene            web name          poster frame  full width  small width
SCENES=( "hero_teardown   hero-teardown     150           1920        960"
         "projects_tray   projects-tray     60            1280        720"
         "security_layers security-layers   205           1280        720"
         "experience_rail experience-rail   50            1280        720"
         "about_deck      about-deck        30            1280        720"
         "contact_gate    contact-gate      90            1280        720" )
for row in "${SCENES[@]}"; do
  read -r scene name poster full small <<<"$row"
  if [ $# -gt 0 ] && [[ ! " $* " =~ " $scene " ]]; then continue; fi
  src=media-src/render/$scene
  [ -f "$src/0001.png" ] || { echo "skip $scene (no frames)"; continue; }
  in=(-framerate 30 -i "$src/%04d.png")
  for variant in "$full:" "$small:-sm"; do
    w=${variant%%:*}; suffix=${variant##*:}
    vf="scale=$w:-2:flags=lanczos,format=yuv420p"
    # VP9 first choice (smaller), H.264 for everything else. No audio track at all.
    ffmpeg -y -loglevel error "${in[@]}" -vf "$vf" -an -c:v libvpx-vp9 -crf 35 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -g 150 "$OUT/$name$suffix.webm"
    ffmpeg -y -loglevel error "${in[@]}" -vf "$vf" -an -c:v libx264 -profile:v high -preset slow -crf 25 -g 150 -movflags +faststart "$OUT/$name$suffix.mp4"
  done
  p=$(printf '%s/%04d.png' "$src" "$poster")
  ffmpeg -y -loglevel error -i "$p" -vf "scale=1600:-2:flags=lanczos" -c:v libwebp -quality 82 "$OUT/$name.webp"
  ffmpeg -y -loglevel error -i "$p" -vf "scale=800:-2:flags=lanczos" -c:v libwebp -quality 80 "$OUT/$name-sm.webp"
  echo "encoded $name"; ls -la "$OUT" | grep "$name" | awk '{printf "  %8.0f KB  %s\n", $5/1024, $9}'
done

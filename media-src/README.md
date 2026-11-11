# Media sources

Everything visual on the site that isn't a project screenshot or one of the credited TikTok clips is original and built from the files in this folder. Nothing is fetched from an external URL at runtime.

## Layout

| Path | What it is |
| --- | --- |
| `blender/common.py` | Shared helpers: Cycles/OptiX setup, the material palette, geometry builders, lights, camera, keyframe baking, output. |
| `blender/<scene>.py` | One procedural script per scene. Running it rebuilds the scene from nothing. |
| `blender/<scene>.blend` | The saved scene with baked keyframes (written by `--save`). Opens in Blender 5.2 LTS. |
| `render/` | PNG frame output. Git-ignored; regenerate it with the commands below. |
| `encode.sh` | FFmpeg: frames → WebM (VP9) + MP4 (H.264) at two sizes, plus WebP posters, into `public/media/`. |
| `brand/build.mjs` | Writes the mark, icons, favicon and avatar into `public/` and `public/brand/`. |
| `brand/card.html` + `brand/render-cards.sh` | Social card, banner and logo lockups, rendered with the site's real fonts in headless Edge/Chrome. |
| `brand/concepts/` | The logo exploration: every concept that was drawn, and the comparison sheets. |

## Scenes

| Script | Used for | Loop | What happens |
| --- | --- | --- | --- |
| `hero_teardown.py` | Home hero | 10 s | An instrument core closes from its exploded view, lights up, and opens again while the camera sways. |
| `projects_tray.py` | Projects | 8 s | Fourteen different parts (one per project) lift and turn in a tray as a strip light crosses. |
| `security_layers.py` | Cybersecurity | 10 s | A probe beam passes each rotating plate once its aperture lines up, and stops at the last plate, which has none. |
| `experience_rail.py` | Experience, Journal | 8 s | Three stations on a graduated rail, with a rack focus travelling between them. |
| `about_deck.py` | About | 6 s | A turntable under red and magenta light; the record makes exactly three turns. |
| `contact_gate.py` | Contact | 6 s | Two slabs stand almost closed and light breathes through the gap. |
| `brand_disc.py` | Avatar, animated logo | 4 s | The mark as a machined disc; a half turn lands on itself. |

Every loop is seamless: all motion is periodic over the frame range, so the last frame leads back into the first.

All scenes share one design language (set in `common.py`): graphite, brushed steel, pearl ceramic, cold-anodised blue and bronze, a cold key light with a warm rim, and a single muted red indicator where something needs flagging. The About scene deliberately swaps the lighting for red and magenta.

## Rebuilding

```bash
# 1. Render frames (GPU, OptiX). --preview renders a few half-size frames first.
blender -b -P media-src/blender/hero_teardown.py -- --preview
blender -b -P media-src/blender/hero_teardown.py -- --save

# 2. Encode everything that has frames
bash media-src/encode.sh

# 3. Brand files
node media-src/brand/build.mjs
bash media-src/brand/render-cards.sh
```

Rendering is resumable: frames that already exist are skipped. `--frames 1-60` or `--frames 1,90` limits the range.

## Where the output lives

- `public/media/<scene>.webm|.mp4` (full size), `-sm.webm|-sm.mp4` (phones), `.webp` / `-sm.webp` (poster).
- `public/brand/`: `mark.svg`, `mark-on-dark.svg`, `mark-on-light.svg`, `icon-dark.svg`, `icon-light.svg`, `icon-512.png`, `icon-light-512.png`, `apple-touch-icon.png`, `avatar.webp|.jpg`, `avatar-400.webp`, `logo-dark.png`, `logo-light.png`, `banner.png`, `mark-loop.webm|.mp4`.
- `public/favicon.svg`, `public/favicon.ico`, `public/og.png`.

## How the site plays them

`src/components/SceneMedia.astro` shows the poster first and puts the video over it. `src/scripts/media.ts` loads a video only when its frame is near the viewport, plays it while visible and pauses it otherwise. Videos have no audio track. In Reduced motion nothing autoplays and the poster stays; the play button on each frame still works. No video is driven by scroll position.

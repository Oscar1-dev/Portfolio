# Oscar Senior — portfolio (v2, "Signal")

Personal portfolio: software engineering and cybersecurity. Astro 5, static output, no UI framework.

## Content

- `src/content/projects/*.md` — every project (frontmatter + write-up). KUSH has its own case study page at `src/pages/projects/kush.astro`; every other project uses `src/pages/projects/[slug].astro`.
- `src/data/experience.ts` — professional experience (Velnqo, KUSH, DISC).
- `src/data/tryhackme.json` — TryHackMe record.
- `src/data/inspiration.ts` — the About page clip gallery; each clip credited by its watermark handle.
- Repository links under the old `github.com/NopsFR/` account are kept in the content but shown as **offline** (that account no longer exists): see `src/data/links.ts` and the rehype step in `astro.config.mjs`.

## Design

Tokens in `src/styles/tokens.css`. Shares DNA with KUSH (carbon inks, expanded uppercase Archivo, hairline editorial rules) with its own infrared → violet "signal" foil. The hero particle field (`src/scripts/signal-field.ts`, raw WebGL2, ~3 KB) loads only when motion is allowed and the device can handle it; the `<h1>` is always real text. Reveals never hide content without JavaScript, and `prefers-reduced-motion` turns motion off.

Version 3 adds depth and scroll-driven motion on top of that system:

- **Scroll sequences.** `src/scripts/scroll-fx.ts` runs Lenis smooth scrolling and writes a `--p` progress value (0 → 1) onto every `[data-progress]` element: `pin` for sticky sequences inside tall containers (hero, statement, KUSH stage, KUSH case-study strip), `pass` for effects across the viewport (tilts, parallax, the terminal printing). CSS does the rest.
- **3D scene.** `src/scripts/scene.ts` (three.js, lazy-loaded on idle, WebGL2 only, skipped with Save-Data) draws an iridescent crystal over a landscape of dots (`src/scripts/terrain.ts`, one shader-driven draw call). The crystal shatters into shards on fast scrolls or when the cursor comes near; the landscape flows with scroll speed and ripples under the cursor. The scene's live colours are mirrored into CSS (`--scene-a/b/c`) for glass edges, labels and the header's reading-progress line. Sections declare a `data-scene` state and the scene blends between the states in view; pointer position moves the lights. Paused when the tab is hidden; phones get a lower pixel ratio and an edge position.
- **Glass.** `.glass` panels (frosted backdrop, bevelled edge, cursor-following specular from `src/scripts/glass.ts`) sit in front of the scene, so the blur has something to refract.
- **Kinetic type.** `[data-split]` headings rise in word by word (`src/scripts/split.ts`); the original text stays as the element's accessible name.

With reduced motion there is no scene, no smooth scrolling and no pinning: pinned sequences show their final frame and everything is in normal flow.

Styles that depend on the `motion-ok` class on `<html>` must be written `:global(.motion-ok) .thing` inside component styles; Astro's scoping otherwise rewrites the selector so it never matches.

## Local development

Requires Node.js 22.12+ and npm. `npm ci`, then:

- Validate: `npm run astro -- check`
- Build: `npm run build` (output: `dist/`)
- Develop: `npm run dev -- --background` (manage with `npm run astro -- dev status|logs|stop`)

## Hosting

- **Vercel (primary):** the Astro preset with defaults works; `astro.config.mjs` serves from `/` when the `VERCEL` environment variable is present.
- **GitHub Pages (legacy):** builds under `/Portfolio/`. Pushes to `main` only validate and build; publishing needs a manual workflow run. Keep it until the Vercel site is verified and its retirement is approved.

## Backups

The v1 site is tagged `v1-before-redesign`.

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

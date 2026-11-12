# Redesign progress — "Teardown"

Branch: `redesign/nops-reimagined` (from `main` @ `a4a594e`, also tagged `pre-redesign-a4a594e`).
**Never push this to `main` without approval: Vercel deploys `main` to production** (project `portfolio`, Vercel scope `portfolio-7511`, repo `Oscar1-dev/Portfolio`).

## Resume commands

```bash
npm install
npx astro dev                      # http://localhost:4321/Portfolio/
npm run check && npx astro build   # type-check + production build
npm run qa                         # browser QA against the dev server (add -- --shots for screenshots)
npm run media                      # render all scenes (resumable) → encode → brand files; log: media-src/render/pipeline.log
```

Individual media steps are in `media-src/README.md`.

## Media status (check this first)

A detached pipeline (`media-src/render-all.sh --wait`) was started on 11 Nov 2026 ~17:00. It waits for the two Blender jobs already running, re-runs every scene (finished frames are skipped), then encodes and builds the brand cards.

- Finished when `media-src/render/pipeline.log` ends with `=== pipeline done`.
- If it was interrupted (PC slept, session closed): run `npm run media` again. It resumes.
- Frames per scene when complete: hero_teardown 300, security_layers 300, projects_tray 240, experience_rail 240, about_deck 180, contact_gate 180, brand_disc 120.
- **Until it finishes, `public/media/*.webp` are temporary half-resolution posters from preview renders and the `.webm/.mp4` files do not exist.** The site falls back to the posters. After the pipeline: check `public/media/` has 6 scenes × (2 webm, 2 mp4, 2 webp), plus `public/og.png`, `public/brand/banner.png`, `logo-dark.png`, `logo-light.png`, `mark-loop.*`.
- Not yet reviewed: the full-length renders. Only preview frames of each scene were inspected. Watch each loop once for seams, flicker or banding before approving.

## Done

- **Source located and verified** (this repo = live site; see the first commit message on the branch).
- **Blender scenes** (procedural, `media-src/blender/*.py`, `.blend` saved on render): hero teardown, projects parts tray, security layers, experience rail, about deck, contact gate, brand disc.
- **Brand**: slotted-disc mark chosen from 8 drawn concepts (`media-src/brand/concepts/`); `Mark.astro` with cut-in animation and half-turn hover; favicon (follows colour scheme), `.ico`, app icons, 3D avatar, card templates.
- **Design system**: `src/styles/tokens.css` with dark + designed light theme, increased-contrast and forced-colours support; 48px targets; 3px focus ring.
- **Chrome**: new header (Projects, Cybersecurity, Experience, Journal, About, Contact), scroll-spy, accessible mobile menu (inert page, Esc, focus return), theme and motion toggles (persisted, follow OS by default), command palette (Ctrl/Cmd+K, `CommandPalette.astro`).
- **Media system**: `SceneMedia.astro` + `src/scripts/media.ts` (lazy, visibility-driven, pause/play, no scroll coupling, poster fallback, Reduced-motion alternative).
- **Home**: new hero with film, film plates on Projects / Experience / Cybersecurity, rebuilt Cybersecurity section (real TryHackMe data + six expandable controls sourced from project write-ups; fake terminal removed), film-backed Contact.
- **Inner pages**: film plate in the intro of Projects, Cybersecurity, Journal (renamed from "Learning log"; URL unchanged), About.
- **Removed**: WebGL backdrop + ASCII artwork, Lenis smooth scrolling (dependency uninstalled). Scroll-linked effects that remain are foreground only.
- **Kept**: all 14 projects, all 33 credited TikTok clips, music section, personal copy, every URL.
- **QA**: `tests/qa.mjs` (axe both themes on 8 pages, 320px reflow, target size, headings/landmarks, keyboard and focus, palette, menu, preferences, video behaviour, links). Last run: see "Known issues".

## Known issues / not done

1. Video-dependent QA checks (3) fail until the encodes exist. Re-run `npm run qa` after the pipeline.
2. Last QA run: 72 of 76 checks passed. Open: caption contrast on the 4th KUSH screenshot on Home (3.89:1, needs 4.5:1, `KushSpotlight.astro` figcaption), and the hero-film check (needs the encoded video). A token-alias fix for KUSH pages in light theme was made after that run and is unverified.
3. Not measured yet: Lighthouse / Core Web Vitals (LCP, INP, CLS) on a production build. `npx lighthouse http://localhost:4321/ --chrome-path="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"` against `VERCEL=1 npx astro build && npx astro preview`.
4. Not tested: real screen reader pass, 200% text-only zoom, real mobile devices, Safari/Firefox.
5. Light theme was only spot-checked on Home and About. KUSH pages deliberately stay dark in both themes.
6. `public/videos/` (the 33 clips) is 197 MB; they already lazy-load but are not re-encoded.
7. `.github/workflows/deploy.yml` and the GitHub Pages copy are unchanged.
8. Old components with leftover `data-scene` attributes are harmless but could be cleaned.

## Ideas held for a later session

Per-project film or live preview on project pages, interactive technology map, light-theme tuning pass on every inner page, About page editorial layout, view-transition polish, project explorer filters by technology.

## Key paths

| What | Where |
| --- | --- |
| Tokens / themes | `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/animations.css` |
| Header, palette, hero, film | `src/components/SiteHeader.astro`, `CommandPalette.astro`, `Hero.astro`, `SceneMedia.astro`, `Mark.astro` |
| Preferences, media, header scripts | `src/scripts/prefs.ts`, `media.ts`, `header.ts`, `scroll-fx.ts` |
| Navigation data | `src/data/nav.ts` |
| Security section | `src/components/CyberSummary.astro` |
| Media sources and docs | `media-src/` (`README.md`, `blender/`, `brand/`, `encode.sh`, `render-all.sh`) |
| Web media output | `public/media/`, `public/brand/`, `public/favicon.*`, `public/og.png` |
| QA | `tests/qa.mjs` → `tests/out/` (git-ignored) |

---

## Update: direction changed to "interface-led" (approved prototype, then extended)

The Blender film direction above was rejected. Renders are stopped and the films are no longer used on any page. `SceneMedia.astro`, `media.ts`, `media-src/blender/` and `public/media/` are left in the repo but unused; delete or keep as you prefer. Only the mark, favicon, icons and avatar from the brand work are still in use.

Now on the home page:
- `Hero.astro`: three real project screenshots floating in depth (links), pointer lean, pause control, closes into a stack on scroll.
- `FlowCard.astro` (NOPS) and `MiniCard.astro` (MINDHOUSE, FEEDBACK): real screenshot at rest, HTML/SVG walk-through on hover, keyboard focus, in view on touch, or the play button. Behaviour in `src/scripts/cards.ts`. The walk-throughs are labelled illustrations.
- KUSH keeps its existing scroll-linked screenshot sequence (`KushSpotlight.astro`).
- `.seam` numbered rule between sections, calmer sentence-case headings, one ambient background (`global.css`).
- Contact is a card, not a film. Inner-page intros are type only.

QA: `npm run qa` passes 75/75 against the dev server (restart `npx astro dev` if styles look stale after large edits).

Still open: Lighthouse / Core Web Vitals not measured; no real screen reader, Firefox, Safari or phone testing; inner pages (project detail, credentials, journal, about) only had their intro restyled; archive rows have no animated media; the three walk-throughs could be replaced by captured footage of the real apps.

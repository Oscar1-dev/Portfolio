# Oscar Portfolio

Existing Astro portfolio with project case studies, credentials, learning log, animations, and media assets.

## Local development

Requires Node.js 22.12 or newer and npm. Install the locked dependencies with `npm ci`.

- Validate: `npm run astro -- check`
- Build: `npm run build` (output: `dist/`)
- Start development in background mode: `npm run dev -- --background`
- Manage development: `npm run astro -- dev status`, `npm run astro -- dev logs`, `npm run astro -- dev stop`

## GitHub and deployment

Source repository: https://github.com/Oscar1-dev/Portfolio

Astro is configured for https://Oscar1-dev.github.io/Portfolio/ using the `/Portfolio/` base path. Local navigation and image paths include this base.

The existing GitHub Pages workflow uses Node.js 22 and `npm ci`. Pushes to `main` run validation and build only. Deployment requires a manual workflow run after owner approval and GitHub Pages configuration (Settings > Pages > Source: GitHub Actions).

The old Git remote is retained locally as `old-origin` for reference. Project repository links under the former account remain historical references until those individual projects are migrated.

No sitemap is generated, so robots.txt does not advertise one.

## Known dependency findings

At migration, `npm audit` reported five affected packages (one low, three high, one critical). Resolving all findings proposes a major Astro upgrade. Dependencies were preserved during migration; address these findings in a separate tested maintenance change.

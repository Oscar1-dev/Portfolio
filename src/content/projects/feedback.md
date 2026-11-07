---
title: "FEEDBACK"
description: "A local-first music and video player built as a desktop app, with an offline library, a phone controller over the local network and a PWA."
projectType: "Desktop App"
status: "Production"
year: 2024
featured: true
order: 1

# Technology Stack
technologies:
  backend:
    - "Rust 1.80"
    - "Tokio async runtime"
    - "SQLite (rusqlite, bundled)"
    - "Tauri 2"
  frontend:
    - "React 19"
    - "TypeScript"
    - "Vite"
    - "CSS Tokens"
    - "pnpm 11"
  infrastructure:
    - "PWA (Vercel)"
    - "GitHub Pages"
    - "Custom Tauri protocols"
    - "LAN server"

# Competencies
competencies:
  - "Systems Programming (Rust)"
  - "Async Runtime (Tokio)"
  - "Desktop Applications (Tauri)"
  - "React Component Architecture"
  - "Accessibility (ARIA roles, focus trapping, axe-core testing)"
  - "E2E Testing"
  - "Cross-platform Builds"
  - "Custom IPC Protocols"
  - "SQLite Database Design"
  - "PWA Deployment"

# Links
links:
  live: "https://feedback-eight-rosy-69.vercel.app"
  github: "https://github.com/NopsFR/FEEDBACK"
  documentation: "https://github.com/NopsFR/FEEDBACK/blob/main/docs/ARCHITECTURE.md"

# Timeline
timeline:
  - date: "2024-Q1"
    event: "Initial Tauri + React scaffold"
  - date: "2024-Q2"
    event: "Library engine + playback system"
  - date: "2024-Q3"
    event: "Metadata editor + downloads"
  - date: "2024-Q4"
    event: "LAN phone server + PWA"
  - date: "2025-Q1"
    event: "WCAG AAA compliance + brand system"

# Metrics
metrics:
  accessibility_testing: "axe-core sweep, zero serious/critical findings"
  contrast_floor: "4.6:1+ on every text token"
  reduced_motion: "Respected app-wide"

# Awards/Recognition
recognition:
  - "Automated accessibility testing (axe-core) wired into the test suite"
  - "Zero paid services (£0 budget)"
  - "Offline-first architecture"
---

## Overview

**FEEDBACK** is a local-first music + music-video player designed for people who collect music and want full control over their library. Built with Rust for performance, React for UI, and Tauri for cross-platform desktop deployment.

### Core Philosophy
- **Local ownership**: Your library lives on your device. No cloud sync required.
- **Offline-first**: Download once, listen anywhere. No subscription.
- **Accessible by default**: ARIA roles, axe-core-tested, reduced-motion support, keyboard-first navigation.
- **Zero budget**: No paid services, no third-party hosting for core features.

---

## Technical Highlights

### Backend: Rust + Tokio
- **Custom protocol handlers** for streaming from device storage
- **Circuit breaker pattern** for rate-limited external APIs (MusicBrainz)
- **Error handling**: User-safe messages in UI, technical details to logs
- **SQLite** for metadata + library state (fully transactional)

### Frontend: React 19 + TypeScript
- **Component architecture** with strict type safety
- **Accessibility**: ARIA labels, keyboard navigation, reduced-motion support
- **Design tokens** (CSS custom properties) for consistent theming
- **E2E testing**: 12+ test scripts with screenshot automation

### Deployment
- **Desktop**: Tauri 2, multi-platform binaries (Windows/Mac/Linux planned)
- **PWA**: Vercel deployment, works offline with service worker
- **LAN Server**: Phone access via local network (no internet required)

---

## Key Features

**Library Management**
- Import music from local directories
- Organize by artist, album, playlist
- Batch metadata editing
- Smart playlist generation

**Playback**
- Full-featured player (seek, shuffle, repeat, queue)
- Gapless playback
- Audio format support (MP3, FLAC, OGG, etc.)
- Visualization

**Metadata**
- MusicBrainz integration (rate-limited)
- Album artwork finder
- Custom metadata editing
- Batch operations

**Accessibility**
- ARIA roles on sliders, menus, dialogs, tabs, and grids
- Contrast tokens held to a 4.6:1+ floor
- Full keyboard navigation with a shortcuts sheet (Ctrl+/)
- Focus trapping in dialogs, `aria-live` regions for status

**Offline & Mobile**
- PWA for offline access
- LAN phone server
- Sync between devices (local network only)

---

## Code Quality

**Testing**
- Unit tests: Vitest (React) + Cargo (Rust)
- E2E tests: Puppeteer-based screenshot automation
- Accessibility testing: `node tests/e2e/a11y.mjs` runs axe-core over the main screens, fails the build on serious/critical violations

**Documentation**
- `docs/MASTER_PLAN.md`: Feature checklist + roadmap
- `docs/ARCHITECTURE.md`: Technical design decisions
- `docs/DESIGN_SYSTEM.md`: Component library + tokens
- `brand/BRAND_GUIDE.md`: Logo, palette, typography

---

## Portfolio Value

**Demonstrates**:
- Rust systems programming + async patterns (Tokio)
- Desktop application development (Tauri)
- Accessibility-first design (ARIA, focus management, automated axe-core testing)
- React component architecture (React 19)
- E2E testing & QA automation
- Performance optimization (Core Web Vitals)
- Open-source practices (GitHub)
- Full-stack thinking (backend + frontend + deployment)

**For roles**: Junior Full-Stack Developer, Rust Engineer, Desktop App Developer, Accessibility Specialist

---

## Deployment

**Live PWA**: https://feedback-eight-rosy-69.vercel.app  
**Verify**: `pnpm test` + `cargo test` + `node tests/e2e/a11y.mjs`

**Build locally**:
```bash
# Windows
.\sync\dev.ps1                    # Run dev server
.\sync\cargotest.cmd              # Run Rust tests
pnpm test                          # Run React tests
pnpm build:pwa                     # Build PWA
node tests/e2e/drive.mjs           # Run E2E tests
```

**Deploy PWA**:
```bash
pnpm deploy:pwa                    # Builds + verifies + deploys to Vercel
```

---

## Learning Path Demonstrated

1. **Systems thinking**: How to design a performant, offline-first app
2. **Async programming**: Tokio runtime, concurrent task management
3. **Accessibility**: built in from day one (ARIA, focus management, automated testing), not retrofitted
4. **Testing**: Unit, integration, E2E, performance all automated
5. **Desktop deployment**: Cross-platform builds with Tauri

---

## Next Steps (Roadmap)

- macOS/Linux binary releases
- Streaming integration (optional cloud backup)
- Collaborative playlists (over LAN)
- Mobile app (native iOS/Android)

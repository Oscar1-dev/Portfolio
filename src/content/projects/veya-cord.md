---
title: "Veyra"
description: "A real-time community platform built as a NestJS and Next.js Turborepo monorepo with Prisma, PostgreSQL and Better Auth."
projectType: "Full-Stack Platform"
status: "Active"
year: 2024
featured: true
order: 2

# Technology Stack
technologies:
  backend:
    - "NestJS 10 (REST + Swagger)"
    - "Node.js"
    - "PostgreSQL"
    - "Prisma (+ @prisma/adapter-pg)"
    - "Better-Auth"
    - "TypeScript"
  frontend:
    - "Next.js"
    - "React 19"
    - "Better-Auth (client)"
    - "TypeScript"
  infrastructure:
    - "Turborepo (monorepo)"
    - "Docker Compose"
    - "pnpm workspaces"

# Competencies
competencies:
  - "Monorepo architecture (Turborepo, shared packages)"
  - "NestJS module/DI architecture"
  - "Prisma schema design over PostgreSQL"
  - "Authentication (Better-Auth)"
  - "Product definition from scratch (own docs/PRODUCT.md, ADRs)"
  - "Full-stack TypeScript"

# Links
links: {}

# Timeline
timeline:
  - date: "2024-Q2"
    event: "Turborepo scaffold — apps/api (NestJS), apps/web (Next.js)"
  - date: "2024-Q3"
    event: "Product foundation doc + architecture decision records"
  - date: "2024-Q4"
    event: "Prisma/PostgreSQL schema + Better-Auth integration"
---

## Overview

**Veyra** is an original realtime social/community platform — its own product, not a Discord bot and not a reskin of an existing project. Its own `docs/PRODUCT.md` is explicit about this: *"It is not a continuation of, or reskin of, any prior project (including Desicord, which is abandoned and contributes no code, architecture, or design decisions here)."* Discord is studied only as a maturity reference point for a chat/community product, never as a template.

This entry was previously described in this portfolio as "VeyraCord — an enterprise Discord bot platform" with Redis, Kubernetes, and a `discord-sdk` package. None of that matched the actual repository — there is no Redis dependency, no `kubernetes/` directory, no CI pipeline, and no Discord.js integration anywhere in the codebase. This entry has been rewritten to describe what's actually there.

## Real scope (from the repo)

- **`apps/api`** — NestJS (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger`), Better-Auth, `reflect-metadata`, `rxjs`
- **`apps/web`** — Next.js + React 19, Better-Auth client
- **`packages/database`** — Prisma + `@prisma/adapter-pg` + `pg` over PostgreSQL
- **`packages/`** — shared workspace packages: `config`, `types`, `validation`, `ui`, `eslint-config`, `typescript-config`
- **`docs/`** — real product/architecture docs: `PRODUCT.md`, `ARCHITECTURE.md`, `BRAND.md`, and an `adr/` (architecture decision records) folder
- **`infrastructure/`** — a single `docker-compose.yml` (Postgres for local dev)

## Product thesis (from the project's own docs)

Veyra's stated bet is that identity and space — not just messaging — are the product: profile customization, community visual identity, and interaction quality are treated as core features, not settings-page afterthoughts. v1 explicitly targets small-to-mid communities, desktop-first, real-time usage — not enterprise/work chat (no SSO/SCIM in scope).

## Portfolio Value

Demonstrates product thinking as much as engineering: a written product foundation and architecture decision records before significant code, a real NestJS + Prisma/PostgreSQL backend, and a Turborepo monorepo with genuinely shared packages.

**Repository**: local project, not currently published to a public GitHub repository.

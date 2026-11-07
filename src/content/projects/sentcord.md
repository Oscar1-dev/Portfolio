---
title: "SentiCord"
description: "A real-time social platform with gothic and graphic-Y2K styling, customisable profiles, cosmetics, badges and 3D elements, built in a NestJS and Next.js monorepo."
projectType: "Full-Stack Platform"
status: "Active"
year: 2024
featured: true
order: 8

# Technology Stack
technologies:
  backend:
    - "NestJS (WebSockets + REST)"
    - "Socket.io"
    - "Better-Auth"
    - "PostgreSQL + Prisma"
    - "AWS S3 (asset storage)"
    - "web-push"
  frontend:
    - "Next.js"
    - "React"
    - "React Three Fiber + drei (3D)"
    - "Framer Motion"
    - "Zustand"
    - "TanStack Query"
    - "React Hook Form + Zod"
  infrastructure:
    - "Turborepo monorepo"
    - "Docker Compose (Postgres/Redis/MinIO/Mailpit)"
    - "pnpm workspaces"

# Competencies
competencies:
  - "Real-time systems (Socket.io + NestJS WebSocket gateways)"
  - "Monorepo architecture (Turborepo, shared packages)"
  - "3D web UI (React Three Fiber)"
  - "Authentication (Better-Auth)"
  - "Object storage (S3-compatible, presigned uploads)"
  - "Web push notifications"
  - "Design systems (brand, cosmetics, badges, profile themes)"
  - "Rate limiting & hardening (NestJS Throttler, Helmet)"

# Links
links: {}

# Timeline
timeline:
  - date: "2024-Q1"
    event: "Turborepo scaffold — apps/api (NestJS), apps/web (Next.js)"
  - date: "2024-Q2"
    event: "Auth, database schema, and profile system"
  - date: "2024-Q3"
    event: "Cosmetics/badges system, 3D profile elements"
  - date: "2024-Q4"
    event: "Web push, asset pipeline, production audit pass"
---

## Overview

**SentiCord** is a gothic / graphic-Y2K aesthetic real-time social platform — customizable user profiles with cosmetics, badges, and interactive 3D elements. Built as a Turborepo monorepo: a NestJS API (WebSocket gateways over Socket.io, Better-Auth, S3-backed asset storage, web push) and a Next.js frontend (React Three Fiber for 3D profile elements, Framer Motion for animation, Zustand + TanStack Query for state/data).

A note on naming: this project was originally documented in this portfolio as an ML/sentiment-analysis application. That description didn't match the actual codebase and has been corrected — SentiCord is a social platform, not a machine learning project.

## Real scope (from the repo)

- `apps/api` — NestJS service: REST + WebSocket gateways, Better-Auth integration, rate limiting (`@nestjs/throttler`), `helmet`, S3 presigned uploads, `web-push`
- `apps/web` — Next.js frontend: React Three Fiber/drei for 3D, `motion` (Framer Motion) for transitions, Zustand for client state, TanStack Query for server state, React Hook Form + Zod for validated forms
- `packages/` — shared workspace packages: `auth`, `database`, `validation`, `types`, `ui`, `3d`, `animations`, `assets`, `config`
- `docs/` — real internal docs: `ARCHITECTURE.md`, `AUTH.md`, `DATABASE.md`, `DESIGN_SYSTEM.md`, `SECURITY.md`, `PROFILE_THEMES.md`, `ROADMAP.md`
- Local dev stack: Docker Compose running Postgres, Redis, MinIO (S3-compatible storage), and Mailpit (email testing)

## Portfolio Value

Demonstrates real-time backend architecture (WebSocket gateways, auth, rate limiting), a genuine monorepo with shared packages, and 3D/animation work on the frontend — a broader full-stack skill set than the platform's cosmetic gothic/Y2K branding suggests.

**Repository**: local project, not currently published to a public GitHub repository.

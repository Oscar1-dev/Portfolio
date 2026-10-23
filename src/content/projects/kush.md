---
title: "KUSH"
description: "An independent software and digital-services business I founded and build: a custom website with Discord sign-in, accounts and 2FA, a Fastify/PostgreSQL platform API, and a provisioned Discord server with its own bot."
tagline: "One account across the website and Discord: sign in with Discord, track tickets and commissions, and staff work from the same records."
projectType: "Business Platform"
status: "Active"
statusNote: "In development and preparing for launch. Runs locally; not publicly hosted yet."
year: 2026
featured: true
order: -2
cover: "/images/projects/kush-home.webp"
flow:
  - "Discord sign-in (OAuth2 + PKCE)"
  - "KUSH account + optional TOTP 2FA"
  - "Website server → platform API"
  - "Zod-validated routes, backend permissions"
  - "PostgreSQL record + audit event"
  - "Bot outbox → Discord roles & messages"

# Technology Stack
technologies:
  website:
    - "Next.js 15 (App Router)"
    - "React 19"
    - "TypeScript"
    - "Tailwind CSS 4"
    - "Motion"
  platform:
    - "Fastify"
    - "Zod (validation + OpenAPI schemas)"
    - "OpenAPI"
    - "Drizzle ORM + SQL migrations"
    - "PostgreSQL"
    - "Vitest (tests against real PostgreSQL)"
  discord:
    - "discord.js bot"
    - "Blueprint-based server provisioning"
    - "Role & permission evaluator"
  desktop:
    - "Tauri 2 + React (internal tools)"
  tooling:
    - "pnpm workspaces + Turborepo"
    - "Playwright + axe-core"

# Competencies
competencies:
  - "Discord OAuth2 with PKCE, server-side verifier, single-use state"
  - "TOTP two-factor authentication with recovery codes and replay protection"
  - "Session management (expiry, idle timeout, per-device revocation)"
  - "Backend-authoritative staff permissions from live Discord roles (fail closed)"
  - "Transactional audit logging"
  - "Optimistic concurrency on business records"
  - "API design with Zod validation and generated OpenAPI"
  - "Discord server architecture: roles, permission overwrites, ticket channels"
  - "Outbox pattern for reliable bot notifications and role sync"
  - "Commission, order, store-credit and referral data models"
  - "Owner-only access design (explicit allowlist + 2FA + re-authentication)"

# Links
links:
  github: "https://github.com/Oscar1-dev/KUSH"

# Timeline
timeline:
  - date: "2026-Q4"
    event: "KUSH replaces the Veyrix brand; platform foundation (Fastify API, PostgreSQL, migrations, accounts, audit)"
  - date: "2026-Q4"
    event: "Website: Discord sign-in, account dashboard, TOTP 2FA, sessions, staff dashboard"
  - date: "2026-Q4"
    event: "Discord: server blueprint and provisioning, permission evaluator, bot runtime, tickets, referrals, role sync"
  - date: "2026-Q4"
    event: "Commerce groundwork: catalogue, commissions, orders, store credit, Stripe gateway (simulated locally)"
  - date: "2026-Q4"
    event: "Automated Discord changelog announcements from GitHub pushes"

# Metrics
metrics:
  API test suite: "125 tests against real PostgreSQL"
  Database migrations: "27, additive"
  API routes: "217 in the generated OpenAPI document"
  Payments: "Simulated locally; no live card payments"
---

KUSH is the business I'm building: websites, web apps, Discord bots and servers, desktop software and technical support, sold as commissions and, later, digital products. It replaces my earlier **Veyrix** branding. I'm the founder and the developer — the website, the platform API, the database, the Discord server and its bot are all mine.

## What's actually built

**Website.** A Next.js site with the public pages (services, pricing, work, careers, contact) and a customer account area. Sign-in is Discord OAuth2 with PKCE: the website server never sees a client secret, the PKCE verifier lives in the API, and each sign-in state can be redeemed exactly once and only by the browser that started it. Accounts can turn on TOTP two-factor authentication with single-use recovery codes, and see and sign out their other sessions.

**Platform API.** A Fastify service in TypeScript over PostgreSQL. Every route validates its input with Zod, which also feeds the generated OpenAPI document. Staff permissions are decided on the server from the member's *current* Discord roles, mapped by role ID rather than name, and the API refuses access if Discord can't be reached rather than guessing. Business changes are written together with an audit event in one transaction, and records carry versions so a stale edit is rejected instead of silently overwriting newer work. The test suite runs against a real, disposable PostgreSQL database.

**Discord.** The server is defined as a blueprint (roles, categories, channels and permission overwrites) and provisioned by the bot with a reviewed, hash-locked plan that never deletes anything on its own. A permission evaluator mirrors Discord's own rules so the plan can prove who can see what before it's applied. The bot runs tickets, referral tracking, role sync and notifications through an outbox, so a Discord outage delays messages instead of losing them. It also posts KUSH's changelog to the server automatically from GitHub pushes.

**Commerce groundwork.** Services and offers, commission intake with written quotes, orders, a store-credit ledger and referral rewards are modelled and wired to the staff tools. The Stripe integration is written, but purchases are **simulated on my machine** — no real payments are taken yet.

**Internal tools.** I'm also building first-party desktop software under KUSH, including an owner-only operations app where access comes from an explicit owner allowlist plus 2FA, with re-authentication for money and access changes. It's in progress.

## Engineering challenges

- **Discord drift.** An early version of the provisioning planner reported "no drift" whenever it couldn't resolve a role — the dangerous failure mode. The rewrite fails closed on anything unresolved, and regression tests now cover the cases that used to pass silently.
- **Trust boundaries.** Browsers never talk to the API directly; the website server does, with a shared secret, and staff routes re-check live Discord roles and recent 2FA on every request. Nothing the browser sends about roles is trusted.
- **Reliable side-effects.** Role changes and notifications are queued in PostgreSQL and delivered by the bot with retries, so a crash or rate limit can't leave the database and Discord disagreeing for long.

## Status

KUSH is still in development and preparing for launch. Everything above runs locally; the site isn't publicly hosted yet, payments are simulated, and planned products and the marketplace are not live. The Discord server is real and running.

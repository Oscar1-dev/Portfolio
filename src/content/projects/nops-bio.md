---
title: "Nops.Bio"
description: "A SaaS profile platform with badges, a small in-app shop, Stripe subscriptions, Discord OAuth and IP/security audit logs."
projectType: "SaaS Platform"
status: "Active"
year: 2023
featured: true
order: 3

# Technology Stack
technologies:
  backend:
    - "Next.js (API routes)"
    - "Prisma ORM + PostgreSQL (pg)"
    - "NextAuth (+ @auth/prisma-adapter)"
    - "Node.js"
    - "TypeScript"
  frontend:
    - "React"
    - "Next.js"
    - "Zustand"
    - "TypeScript"
  integrations:
    - "Stripe (payments)"
    - "Discord OAuth (via discord.js + NextAuth)"
    - "Sharp (image processing)"
    - "Sonner (toast notifications)"

# Competencies
competencies:
  - "SaaS architecture (subscriptions, gamification, shop)"
  - "Prisma ORM (16-model schema)"
  - "NextAuth + Discord OAuth"
  - "Stripe subscription integration"
  - "Security audit logging (IpLog, SecurityLog models)"
  - "Full-Stack TypeScript"

# Links
links: {}

# Timeline
timeline:
  - date: "2023-Q2"
    event: "Next.js + Prisma scaffold, NextAuth + Discord OAuth"
  - date: "2023-Q3"
    event: "Stripe subscriptions + badge/shop system"
  - date: "2023-Q4"
    event: "IP + security audit logging"
---

## Overview

**Nops.Bio** is a SaaS profile platform: users build a customizable bio/link page, earn badges, spend on a small in-app shop, and can subscribe via Stripe. Authentication runs through NextAuth with Discord OAuth. Security-relevant activity (IP addresses, sensitive account actions) is written to dedicated audit-log tables.

A note on accuracy: this entry previously listed an invented 18-model schema (`UserProfile`, `Achievement`, `Leaderboard`, `AuditLog`, etc.), Redis caching, Sentry monitoring, and specific numbers (1,000+ users, 92% retention, 99.9% uptime) that don't appear anywhere in the actual codebase. The real schema and stack are below.

## Real scope (from `prisma/schema.prisma`)

16 models, confirmed directly from the schema file: `User`, `Account`, `Session`, `VerificationToken` (NextAuth's standard models), `Profile`, `Badge`, `UserBadge`, `Image`, `Subscription`, `IpLog`, `SecurityLog`, `Ticket`, `Transaction`, `Asset`, `ShopPurchase`, `ViewLog`.

- **Auth**: NextAuth + `@auth/prisma-adapter`, Discord OAuth
- **Payments**: Stripe (`@stripe/stripe-js`, `stripe`), tracked via `Subscription` and `Transaction`
- **Gamification/shop**: `Badge`/`UserBadge` for earned badges, `Asset`/`ShopPurchase` for a small in-app shop
- **Audit**: `IpLog` and `SecurityLog` — real tables, genuinely present in the schema
- **Analytics**: `ViewLog` for profile views
- **Support**: `Ticket` model
- Image handling via `sharp`, client state via `zustand`, toasts via `sonner`

## Portfolio Value

Demonstrates a full SaaS data model (auth, billing, gamification, audit logging) built on Prisma/PostgreSQL with NextAuth — a genuinely broad schema even without the inflated model count.

**Repository**: same codebase now ships under the name **WebBio** on GitHub (private repository, not currently public).

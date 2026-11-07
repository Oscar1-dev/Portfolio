---
title: "Desicord"
description: "A Discord-style desktop chat client with a Tauri and React frontend over a Rust/Axum API, covering servers, channels, DMs, roles, moderation and TOTP 2FA."
projectType: "Desktop App"
status: "Active"
year: 2024
featured: false
order: 6
logo: "/images/projects/desicord.jpg"

# Technology Stack
technologies:
  desktop:
    - "Tauri 2"
    - "React 19"
    - "TypeScript"
    - "Vite"
  backend:
    - "Rust"
    - "Axum"
    - "PostgreSQL + SQLx migrations"
    - "Authenticated WebSockets (Postgres notifications)"
  shared:
    - "Rust workspace (shared-types crate)"

# Competencies
competencies:
  - "Tauri 2 desktop app architecture"
  - "Rust/Axum API design"
  - "PostgreSQL schema design + SQLx migrations"
  - "Realtime updates via authenticated WebSockets"
  - "TOTP two-factor authentication"
  - "Role-based permissions & moderation tooling"
  - "OAuth-style provider sign-in (GitHub/Google/Microsoft controls)"

# Links
links: {}

# Timeline
timeline:
  - date: "2024-Q3"
    event: "Tauri 2 + React shell, authentication screen"
  - date: "2024-Q4"
    event: "Rust/Axum API, PostgreSQL schema, DMs"
  - date: "2025-Q1"
    event: "Servers/channels/roles/moderation, TOTP 2FA, profile cosmetics"
---

## Overview

**Desicord** is a Discord-style chat client: a Tauri 2 desktop shell with a React 19 + TypeScript UI, backed by a Rust/Axum API with PostgreSQL persistence (SQLx migrations) and authenticated WebSocket realtime updates (driven off Postgres notifications).

The starter is explicitly designed with **no fake seeded data** — the UI is built around proper empty states so the product stays honest until real data exists, which shaped how the auth flow, empty states, and "preview shell" mode were built.

## Real scope (from the repo)

- **Desktop**: `apps/desktop` — Tauri 2 + React 19 + Vite, three-column app shell (servers / channels / content)
- **API**: `services/api` — Rust + Axum, running on `127.0.0.1:8787` in dev
- **Shared types**: `crates/shared-types` — a Rust crate shared between the API and Tauri layers
- Sign-in/create-account with GitHub, Google, and Microsoft provider controls
- Home, Friends/Requests, Shop, Pulse, Servers, Profile Studio, and Settings views
- Direct messages: replies, edits, deletion, pagination, attachments
- Server channels: members, roles, invites, moderation, audit logs, realtime refresh
- Account security: TOTP two-factor authentication, profile cosmetics/badges

## Portfolio Value

Demonstrates a real Rust backend (Axum + SQLx + WebSockets) paired with a Tauri desktop client — full-stack ownership from database schema to native app shell, plus security-relevant features (TOTP 2FA, role-based moderation) that go beyond a typical CRUD app.

**Repository**: local project (Desicord Starter), not currently published to a public GitHub repository.

---
title: "Inertia"
description: "A game marketplace with a static storefront, a hand-written Node.js HTTP server, Stripe checkout, MongoDB and five Discord bots for operations."
projectType: "E-Commerce / Bot Ecosystem"
status: "Active"
year: 2023
featured: true
order: 10
logo: "/images/projects/inertia.png"

# Technology Stack
technologies:
  server:
    - "Node.js (raw `http` module — no framework)"
    - "Stripe Checkout + webhooks"
    - "MongoDB + Mongoose"
  frontend:
    - "Static HTML/CSS/JS storefront"
  bots:
    - "discord.js (5 separate bot processes)"
    - "PM2 (ecosystem.config.js)"

# Competencies
competencies:
  - "Building an HTTP server without a framework (raw Node.js `http`)"
  - "Stripe Checkout sessions + signed webhook verification"
  - "Multi-bot architecture (sales, tickets, management, auth, vouches)"
  - "MongoDB/Mongoose data modeling"
  - "Process management (PM2, multi-process deployment)"

# Links
links:
  github: "https://github.com/NopsFR/Inertia"

# Timeline
timeline:
  - date: "2023-Q2"
    event: "Storefront + hand-rolled Node.js HTTP server"
  - date: "2023-Q3"
    event: "Stripe Checkout + webhook-driven order flow"
  - date: "2023-Q4"
    event: "Discord bot fleet: sales, tickets, management, authing, vouches"
---

## Overview

**Inertia** ("Game Marketplace") is a real storefront for selling time-limited game licenses/products: a static frontend, a Stripe-powered checkout flow, and — instead of a single backend framework — a small fleet of five purpose-built Discord bots (`sales`, `ticket`, `management`, `authing`, `vouches`) that turn store events into operational Discord activity.

This entry was previously described as a Next.js/Prisma SaaS marketplace. The real repository has no Next.js, no React, and no Prisma anywhere in it — it's a hand-rolled Node.js HTTP server (`server.js`, built directly on the `http` module, no Express) with MongoDB via Mongoose, corrected here.

## Real scope (from the repo)

- **`server.js`** — a Node.js server built directly on the core `http` module (deliberately no Express/Next.js), handling Stripe Checkout session creation and a signed `/api/stripe/webhook` endpoint
- **`bots/sales.js`** — posts real-time purchase embeds to a Discord `#sales` channel with order ID, price, duration, and customer info
- **`bots/ticket.js`, `bots/management.js`, `bots/authing.js`, `bots/vouches.js`** — support tickets, staff management, license activation, and customer vouches/reviews, each a separate `discord.js` bot process
- **`ecosystem.config.js`** — PM2 configuration running all five bots plus the web server as separate managed processes
- MongoDB (Mongoose) for orders, users, and vouches

## Portfolio Value

Demonstrates building a payment flow without leaning on a framework (raw HTTP server + signed webhook verification), and a multi-process architecture where Discord itself becomes the ops dashboard — sales, support, and moderation all surface as bot activity in specific channels.

**Repository**: [github.com/NopsFR/Inertia](https://github.com/NopsFR/Inertia) (public).

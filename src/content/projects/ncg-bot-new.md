---
title: "NCG Discord Bot"
description: "A Discord bot and web panel for managing Rust game servers and teams, with Steam-linked Rust+ pairing, FCM notifications and smart-device or camera control."
projectType: "Bot Platform"
status: "Active"
year: 2024
featured: false
order: 7
logo: "/images/projects/ncg-bot-new.jpg"

# Technology Stack
technologies:
  core:
    - "Discord.js v14 (slash commands)"
    - "Node.js"
    - "Express (web panel)"
    - "MongoDB + Mongoose"
  integrations:
    - "@liamcottle/rustplus.js (Rust+ companion API)"
    - "@liamcottle/push-receiver (FCM push, device pairing)"
    - "Jimp (in-game camera image processing)"
  deployment:
    - "Docker"
    - "PM2 (ecosystem.config.js)"
    - "Railway / Render configs"

# Competencies
competencies:
  - "Discord.js slash commands (deploy:commands registration flow)"
  - "OAuth-style account linking (Steam-authenticated Rust+ pairing)"
  - "Firebase Cloud Messaging (device pairing notifications)"
  - "MongoDB/Mongoose data modeling"
  - "Express web panel (login + device/camera control UI)"
  - "Multi-target deployment (Docker, PM2, Railway, Render)"

# Links
links:
  github: "https://github.com/NopsFR/Discord-Bot"

# Timeline
timeline:
  - date: "2024-Q1"
    event: "Discord.js slash command bot + Rust+ pairing flow"
  - date: "2024-Q2"
    event: "Web panel (login, camera, device control) + MongoDB persistence"
  - date: "2024-Q3"
    event: "Multi-platform deployment configs (Docker/PM2/Railway/Render)"
---

## Overview

**NCG Discord Bot** is a Discord bot and companion web panel for managing a *Rust* (the video game) server and team, with full Rust+ companion-app integration. Users link their Steam-authenticated Rust+ account through a self-serve login page (`/pair` in Discord opens a private login link); the bot then registers Firebase Cloud Messaging push credentials and receives pairing notifications when the player pairs their server or smart devices in-game.

This entry was previously described in this portfolio as an economy/moderation bot with PostgreSQL — that didn't match the codebase. It's actually a Rust+ team-management integration on MongoDB, which is corrected here.

## Real scope (from the repo)

- Discord.js v14 slash commands, registered via a `deploy:commands` npm script
- Express-based web panel (`public/index.html`, `public/login.html`, `public/camera.html`) for Steam login and in-game smart camera/device control
- MongoDB + Mongoose for persistence
- FCM push via `@liamcottle/push-receiver` for real-time device pairing events
- `Jimp` for processing in-game smart camera frames
- Deployment configs for Docker, PM2 (`ecosystem.config.js`), Railway, and Render

## Portfolio Value

Demonstrates a real third-party API integration (Rust+ companion protocol), an OAuth-style account-linking flow, push notification handling, and shipping the same bot across multiple hosting targets.

**For roles**: Bot Developer, Backend/Integration Engineer

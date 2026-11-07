---
title: "Rust+ Discord Bridge"
description: "A Node.js Discord bot that connects a Discord server to the Rust+ companion API for chat and live player or server status."
projectType: "Integration / Bot"
status: "Learning"
year: 2024
featured: false
order: 5

# Technology Stack
technologies:
  core:
    - "Node.js"
    - "discord.js v14"
    - "@liamcottle/rustplus.js"
    - "dotenv"

# Competencies
competencies:
  - "Discord.js event handling (Gateway intents, message events)"
  - "Third-party WebSocket API integration (Rust+ companion protocol)"
  - "Async/await error handling and connection timeouts"
  - "Environment-based configuration"

# Links
links: {}

# Timeline
timeline:
  - date: "2024-Q2"
    event: "Discord.js client scaffold + !hello command"
  - date: "2024-Q2"
    event: "Rust+ companion API integration (!rustinfo)"
---

## Overview

A small, honest starter project: a Node.js Discord bot using **discord.js v14** that replies to `!hello`, and a `!rustinfo` command that connects to the [Rust+ companion app API](https://www.rustplus.io/) (via `@liamcottle/rustplus.js`) to pull live server name and player count from a *Rust* (the video game) server.

Named "Discord Bot (Rust)" originally — worth being precise: this is **not** written in the Rust programming language. It integrates Discord.js with the Rust+ game API. Kept in the portfolio because the Rust+ WebSocket integration (connection timeouts, config validation, graceful error messages back to Discord) is a real, working piece of async JS.

## What it actually does

- `!hello` → replies "Hello, world!"
- `!rustinfo` → connects to a configured Rust+ server over its companion WebSocket API and replies with the server name and current player count, or a clear error if the connection times out or credentials are missing

## Source

```js
// src/rustplusClient.js — connection with timeout + promise caching
async connect() {
  if (!this.config) throw new Error('Rust+ is not configured...');
  if (this.connected) return this.client;
  if (this.connectPromise) return this.connectPromise;

  this.client = new RustPlus(this.config.ip, this.config.port, this.config.playerId, this.config.playerToken);

  this.connectPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out connecting to Rust+...')), 15000);
    this.client.once('connected', () => { clearTimeout(timeout); this.connected = true; resolve(this.client); });
    this.client.once('error', (error) => { clearTimeout(timeout); reject(error); });
  });
}
```

## Honest scope

~150 lines total across three files (`config.js`, `discordBot.js`, `rustplusClient.js`). This is a starter/learning project, not a production system — listed here as a small, real example of async API integration rather than inflated as systems programming.

**Repository**: local project, not currently published to a public GitHub repository.

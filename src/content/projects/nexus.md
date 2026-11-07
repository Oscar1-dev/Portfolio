---
title: "NEXUS Cyber Lab"
description: "A Tauri and React desktop training simulator with 17 safe, synthetic cybersecurity tool profiles. It does not scan or exploit real systems."
projectType: "Desktop App / Education"
status: "Active"
year: 2024
featured: true
order: 9

# Technology Stack
technologies:
  desktop:
    - "Tauri 2"
    - "React + React Router"
    - "Framer Motion"
    - "d3-geo + topojson-client (simulated world map)"
  backend:
    - "Fastify"
    - "PostgreSQL 17"
    - "jose (JWT)"
    - "@fastify/helmet, @fastify/rate-limit, @fastify/cors"
    - "Zod (validation)"
  infrastructure:
    - "Docker Compose (Postgres)"
    - "Windows packaging (MSI/NSIS via Tauri)"

# Competencies
competencies:
  - "Desktop app architecture (Tauri 2, native window chrome)"
  - "Simulated/synthetic security tooling (safe-by-design — no live exploitation)"
  - "Fastify API design with rate limiting and security headers"
  - "Accessibility (colour-accessibility modes, reduced-motion, i18n in 4 languages)"
  - "Data visualization (d3-geo world map)"
  - "Windows installer packaging"

# Links
links: {}

# Timeline
timeline:
  - date: "2024-Q1"
    event: "Tauri 2 + React shell, sidebar navigation (16 destinations)"
  - date: "2024-Q2"
    event: "Fastify backend, PostgreSQL schema, JWT auth"
  - date: "2024-Q3"
    event: "17 synthetic tool profiles, simulated world map"
  - date: "2024-Q4"
    event: "Accessibility pass (colour modes, i18n), Windows MSI/NSIS packaging"
---

## Overview

**NEXUS Cyber Lab** is a desktop cybersecurity training simulator — an interactive classroom environment for teaching security concepts without touching real systems. Built with Tauri 2 and React on the desktop, and a Fastify + PostgreSQL backend.

This entry previously described NEXUS as "Docker/Kubernetes infrastructure with Kali Linux tools, Metasploit, and Burp Suite integration." That didn't match the real project — corrected here. The actual, and more interesting, design choice is explicit in the project's own README: *"All routes use fictional or documentation-only data and do not scan, exploit or capture external systems."* It's a safe, synthetic training tool, not a live pentesting platform.

## Real scope (from the repo)

- **Desktop shell**: Tauri 2 with a custom frameless title bar, 16 routed sidebar destinations
- **Simulated tooling**: 17 "safe tool profiles" with synthetic live output and defender-evidence displays — teaching what security tools *look like* in use, without executing anything against real infrastructure
- **World map**: a simulated global view built with `d3-geo`/`topojson-client`
- **Backend**: Fastify API with `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cors`, JWT auth via `jose`, Zod-validated inputs, PostgreSQL 17 (Docker Compose for local dev)
- **Accessibility**: five colour-accessibility modes, reduced-motion support, density controls, and interface labels in English/French/Spanish/German
- **Packaging**: Windows MSI and NSIS installers built via Tauri

## Portfolio Value

Demonstrates a deliberately safe approach to teaching offensive/defensive security concepts (synthetic data, no real scanning), paired with real desktop-app engineering (Tauri, native packaging) and a properly hardened Fastify API (rate limiting, security headers, JWT, validated input).

**Repository**: local project, not currently published to a public GitHub repository.

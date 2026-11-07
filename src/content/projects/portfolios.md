---
title: "Cipher Protocol"
description: "An earlier React and Vite portfolio with a TryHackMe badge gallery, an admin dashboard and media stored in Vercel Blob."
projectType: "Design/UX"
status: "Active"
year: 2023
featured: true
order: 11

# Technology Stack
technologies:
  frontend:
    - "React"
    - "React Router"
    - "Vite"
    - "Tailwind CSS"
    - "Framer Motion"
    - "lucide-react"
  backend:
    - "Vercel serverless API routes"
    - "@vercel/blob (media storage)"

# Competencies
competencies:
  - "SPA routing on Vercel (solved SPA-vs-framework-detection routing bugs)"
  - "Responsive design (mobile support pass)"
  - "Motion design (Framer Motion, glow/hover effects)"
  - "Serverless media storage (Vercel Blob, admin media page)"
  - "Privacy-conscious footer/legal page"
  - "Iterative UX (32+ commits of real refinement)"

# Links
links:
  github: "https://github.com/NopsFR/New-portoflio"

# Timeline
timeline:
  - date: "2023-Q4"
    event: "Hero section, skill categories, Vercel deploy config"
  - date: "2024-Q1"
    event: "TryHackMe badge gallery with rarity filtering"
  - date: "2024-Q1"
    event: "Personal bio page, privacy page, admin dashboard"
  - date: "2024-Q2"
    event: "Vercel Blob media storage + SPA routing fixes"
---

## Overview

**Cipher Protocol** ("Oscar Senior — Cipher Protocol") is the personal portfolio site itself — a React + Vite single-page app styled around a "Penetration Tester / Red Team Operator" identity, deployed on Vercel.

This entry was previously described as "three portfolio design iterations" with fake `v1`/`v2`/`v3` demo links (`portfolio-v1.example.com`, etc.) that don't resolve. It's actually one continuously-evolving project with real, verifiable history — corrected here to reflect that, with the real public GitHub repository.

## Real scope (from the repo)

- **32+ commits** of real iteration: hero section glow/letter-spacing fixes, responsive mobile pass, centered layout work, nav spacing
- A **TryHackMe badge gallery** with rarity filtering built directly into the site
- A private admin dashboard (`/Oscar.admin`) with analytics, user management, security, and config sections
- A personal bio page and a data-privacy page
- `@vercel/blob` serverless API routes (`api/upload.js`, `api/list-images.js`) for an admin media gallery
- Several real bug-fix commits around Vercel's SPA routing vs. framework auto-detection (`vercel.json` rewrites, `framework: vite` pinning)

## Portfolio Value

Demonstrates real iterative product/UX work on a live, shipped site — including the unglamorous parts (routing bugs, mobile responsiveness, deployment config) that don't show up in a feature list but are exactly what a working engineer deals with.

**Repository**: [github.com/NopsFR/New-portoflio](https://github.com/NopsFR/New-portoflio) (public).

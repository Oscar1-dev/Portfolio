---
title: "MINDHOUSE"
description: "A multi-agent AI workspace with one coordinator and four specialists. Each agent has its own tools, memory and LLM reasoning loop, presented as rooms rather than a dashboard."
tagline: "Five agents, one facility — a coordinator that delegates by judgment, not keyword-matching, and specialists with real tools of their own."
projectType: "Multi-Agent AI Platform"
status: "Active"
year: 2026
featured: true
order: -1
cover: "/images/projects/mindhouse.png"
flow:
  - "User message"
  - "Intent reasoning"
  - "Tool selection"
  - "Specialist delegation"
  - "Real tool execution"
  - "Synthesized response"

# Technology Stack
technologies:
  frontend:
    - "React 19"
    - "TypeScript"
    - "Vite 8"
    - "Tailwind CSS v4"
    - "Motion (Framer Motion)"
    - "Zustand"
  ai:
    - "Ollama (local LLM inference)"
    - "Custom OpenAI-style tool/function-calling protocol"
    - "Composable, fragment-based system-prompt architecture"
  tooling:
    - "Custom Vite plugin (apply: 'serve') for a local-only agent runtime"
    - "Node.js fs/child_process, sandboxed to a workspace directory"
    - "Path-traversal-safe filesystem boundary"
  deployment:
    - "Vercel"
    - "GitHub Pages (GitHub Actions)"

# Competencies
competencies:
  - "Agent/Tool/World architectural separation (identity vs. capability vs. presentation)"
  - "Real ReAct-style tool-calling loop (plan, call, observe, reason, retry) against a local model"
  - "Delegation modeled as a tool call the model itself chooses, not a keyword router"
  - "Composable system-prompt design (reasoning, tool-use, safety and style policy as separate reusable fragments)"
  - "Sandboxed local code execution with an explicit, verified security boundary between dev and production builds"
  - "Configurable autonomy levels gating filesystem/terminal access"
  - "Honest capability signalling — a heuristic fallback layer that's clearly labelled when no model is connected, never a fabricated response"
  - "Intent classification without hard-coded topic whitelists"

# Links
links:
  live: "https://mindhouse-beta.vercel.app"
  github: "https://github.com/NopsFR/mindhouse"

# Timeline
timeline:
  - date: "2026-Q3"
    event: "Initial facility build: agent registry, mock intelligence tools, communication bus, memory model"
  - date: "2026-Q3"
    event: "Rebuild: removed generic dashboard visuals, replaced with a spatial doorway-based navigation model"
  - date: "2026-Q3"
    event: "Conversation engine rewrite: intent classification, multi-specialist delegation, real citations"
  - date: "2026-Q3"
    event: "Real local tool execution: sandboxed dev-tools server, filesystem/terminal tools, autonomy levels"
  - date: "2026-Q3"
    event: "Agent reasoning overhaul: real tool-calling loop, delegation-as-a-tool, composable system prompts"

# Metrics
metrics:
  Agents: "5 (1 coordinator + 4 specialists)"
  Autonomy levels: "3 (chat only / read / read+write+run)"
  Cost: "£0 — local model + free hosting, no paid API"
---

## What it is

MINDHOUSE is a small facility of AI agents, presented as a physical space rather than a dashboard. Jarvis is the central coordinating intelligence; Mancy, Null, Atlas and Orbit are specialists covering Manchester, cybersecurity, global events, and space respectively. Each agent has its own identity, its own tools, and its own memory — walking into a room shows that agent's real, live state, never a mocked-up preview.

## Why I built it

Most "AI dashboard" demos are the same thing: node-and-line diagrams standing in for agents that don't actually do anything. I wanted the opposite — agents that reason for real, that can actually touch a filesystem and a terminal when running locally, and a coordinator that decides to delegate because it judged the delegation was useful, not because a message happened to contain a keyword. I also set myself a hard constraint: £0 budget. No paid API key, ever — the real intelligence layer runs on a local Ollama model when one is available, and falls back to an honestly-labelled, hand-curated knowledge base when it isn't.

## How it works

A message to Jarvis is handled by whichever layer is actually available. With a local tool-calling-capable model connected, the request goes straight into a real ReAct loop: the model sees the tools it currently has (its own current-information lookup, `consult_specialist` if it's Jarvis, and — only when running locally — real filesystem/terminal tools), decides whether to call one, gets the real result back, and reasons again, up to a step cap. Nothing here is scripted: if a tool call fails, the model sees the actual error and can retry. With no model connected, the same conversation is handled by an explicitly-labelled fallback layer — intent classification distinguishes a greeting, a bare topic, a follow-up, and a genuine question, so an ambiguous message gets a clarifying question instead of a dead end.

## Real local tool execution — and its security boundary

Running the app locally (`npm run dev`) starts a second thing alongside the UI: a sandboxed tool-execution server built as a Vite plugin with `apply: 'serve'` — Vite's own mechanism for "this code does not exist in a production build." It exposes filesystem and terminal endpoints confined to a single workspace directory (`path.resolve` plus a strict prefix check rejects any path-traversal attempt), gated behind three autonomy levels the user picks explicitly: chat only, read-only, or read/write/execute. I verified this boundary directly — grepping the built production bundle shows zero trace of `child_process`, `node:fs`, or the workspace path, and a live path-escape attempt against the running dev server was correctly rejected. The publicly deployed site never gains code-execution capability; it's identical in that respect however many people visit it.

## Delegation as a tool, not a router

Earlier versions of this forced delegation by scanning the user's message for keywords ("Manchester" → always ask Mancy). That's brittle and doesn't scale. The current design exposes `consult_specialist` to Jarvis as an ordinary tool, with the same calling convention as every other tool — the model decides whether asking a specialist would actually improve its answer, the same way it decides whether to read a file. The system prompt itself is composed from reusable policy fragments (reasoning, tool-use, delegation, memory, safety, communication style) rather than one hard-coded block per agent, so a policy change applies everywhere at once.

## Portfolio value

Demonstrates real multi-agent system design rather than a themed chatbot: a genuine tool-calling reasoning loop, a security boundary that's actually verified rather than assumed, delegation modeled as agent judgment instead of string-matching, and an honest fallback path that never pretends to be smarter than the model actually connected. Still actively evolving — the reasoning layer in particular is being iterated on.

**Repository**: [github.com/NopsFR/mindhouse](https://github.com/NopsFR/mindhouse) (public) · **Live**: [mindhouse-beta.vercel.app](https://mindhouse-beta.vercel.app)

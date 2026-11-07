---
title: "NOPS / Cyber Intelligence"
description: "A Next.js and PostgreSQL investigation workspace that detects observables, queries 35 threat-intelligence provider modules, correlates results and builds evidence graphs and cases."
tagline: "One box to paste an IP, domain, URL, hash or CVE into — and a full, provenance-tracked investigation comes back."
projectType: "Cybersecurity Platform"
status: "Production"
year: 2026
featured: true
order: 0
cover: "/images/projects/nops-investigations.webp"
flow:
  - "Input"
  - "Observable detection"
  - "Normalization"
  - "Provider orchestration"
  - "Validation"
  - "Correlation"
  - "Findings"
  - "Evidence / Graph / Report"

# Technology Stack
technologies:
  frontend:
    - "Next.js (App Router)"
    - "React"
    - "TypeScript"
    - "Tailwind CSS"
    - "@xyflow/react + d3-force (evidence graph)"
  backend:
    - "Next.js API routes"
    - "Node.js"
    - "Zod (schema validation)"
    - "Prisma ORM"
  data:
    - "PostgreSQL"
    - "Supabase"
  security:
    - "SSRF-hardened outbound fetch layer"
    - "DNS-rebinding-safe resolution"
    - "Per-route rate limiting"
    - "Security headers (CSP with nonces)"
  testing:
    - "Vitest"
    - "Playwright"
    - "Testing Library"
  deployment:
    - "Vercel"

# Competencies
competencies:
  - "Provider-adapter architecture (35 modules behind one interface)"
  - "SSRF-hardened outbound request layer (blocked hostnames, DNS-rebinding-safe lookups, public-IP-only policy, per-hop redirect re-validation)"
  - "Zod-validated, schema-resilient parsing of live third-party APIs"
  - "Explicit degraded states instead of fabricated data (not configured / rate limited / timeout / partial)"
  - "Evidence graph rendering (React Flow + force-directed layout)"
  - "Correlation engine across independently-fetched provider results"
  - "Audit-grade findings provenance (source, rule, observed-at, confidence, references)"
  - "Database persistence and production migration handling (Prisma + Postgres)"
  - "Automated testing (299 unit/integration tests) and Playwright browser QA"
  - "CSV-injection-safe and defanged export formats (CSV, Markdown)"

# Links
links:
  live: "https://nops-cyber-intelligence.vercel.app"
  github: "https://github.com/NopsFR/Intelligence-Investigation"

# Timeline
timeline:
  - date: "2026-Q1"
    event: "Core engine: observable detection/normalization, provider-adapter architecture, native DNS/email/TLS/header intelligence"
  - date: "2026-Q2"
    event: "Investigation orchestrator, correlation engine, findings/evidence persistence, Postgres + Prisma"
  - date: "2026-Q2"
    event: "UI rebuild: command palette, investigation workspace, evidence relationship graph"
  - date: "2026-Q3"
    event: "Analysis expansion: file/binary triage, PCAP workbench, YARA/Sigma detection labs, code & dependency security"
  - date: "2026-Q3"
    event: "Response expansion: exposure & web-security workspaces, live threat feed, cases/DFIR, IOC library"
  - date: "2026-Q3"
    event: "Hardening pass: SSRF/redirect/rate-limit controls, provider health monitoring, full test suite, production deploy"

# Metrics
metrics:
  Provider modules: "35"
  Automated tests: "299 passing"
  Investigation modes: "Quick / Deep"
  Findings states: "6 explicit outcomes, never fabricated"
---

## What it is

NOPS is a unified cybersecurity intelligence and investigation workspace. You give it one observable — an IP, domain, URL, file hash, email address, CVE, or ASN — and it detects what that observable actually is, fans the request out across dozens of specialised sources, and comes back with a single investigation record: normalised findings, full evidence provenance, a relationship graph, and an audit trail, not a pile of disconnected API responses.

## Why I built it

Every free threat-intel tool I'd used did one thing: VirusTotal does hashes, crt.sh does certificates, ThreatFox does IOCs. Actually investigating something — "is this domain part of the same infrastructure as this IP, and what does that mean for severity" — meant opening eight tabs and doing the correlation in my head. I wanted the correlation to be the product, not something left as an exercise for whoever's investigating. The harder constraint I set myself: if a provider is down, unconfigured, or rate-limited, the investigation has to say so honestly — never quietly show nothing, and never fabricate a result to fill the gap.

## How it works

The investigation flow is the same for every observable type — shown step by step above. Detection decides what you've actually pasted in (IPv4/IPv6, domain, URL, hash, email, CVE, ASN, or certificate); normalization standardises casing and format; provider orchestration runs the relevant subset of the 35 modules in parallel; every response is Zod-validated before it's trusted; correlation checks whether independent findings from different sources point at the same infrastructure or actor; and the final findings, evidence graph, and exportable report are all built from that one underlying evidence set — not three separate summaries that can drift apart.

## Real scope (from the repo)

- **Observable types**: IPv4/IPv6, domain, URL, MD5/SHA1/SHA256, email, CVE, ASN, certificate — each with its own detection and normalization rules
- **35 provider modules** behind one adapter interface — native analyzers (DNS records, DNSSEC, reverse DNS, email security/SPF/DKIM/DMARC, TLS inspection, HTTP security headers, hosting/ASN context) plus live external sources: VirusTotal, AbuseIPDB, GreyNoise, AlienVault OTX, Web of Trust, ThreatFox, URLhaus, MalwareBazaar, Feodo Tracker, YARAify, CIRCL Hashlookup, crt.sh, Cert Spotter, RDAP, RIPEstat, mnemonic PassiveDNS, urlscan.io, NVD, CVE.org, CISA KEV, EPSS, plus internal correlation and MITRE ATT&CK mapping
- **Investigation modes**: Quick (fast, cached-friendly) and Deep (broader provider coverage, longer timeout budget)
- **Evidence graph**: relationships between observables (shared infrastructure, resolved-to, communicates-with) rendered with React Flow and a force-directed layout, each edge carrying its source providers and an observed-at timestamp
- **Cases & IOC library**: investigations can be attached to a case for ongoing work; confirmed indicators persist to a searchable IOC library
- **Analysis labs**: file/binary triage (static, local — nothing executed), a PCAP workbench, a YARA rule engine subset and Sigma rule parser/evaluator, code/dependency security via OSV, network calculators, password security, a decoder and crypto lab
- **Live threat feed**: recent IOCs pulled directly from ThreatFox, URLhaus, MalwareBazaar and Feodo Tracker
- **Reports**: Markdown (observables auto-defanged so it's safe to paste into a ticket) and CSV (with formula-injection characters escaped) exports, generated from the same findings data as the UI
- **API Observatory**: live status of every configured provider — connected, degraded, or not configured — so the system is honest about its own coverage, not just the data it returns

## Engineering & security decisions

This is the part I'm proudest of, because none of it is visible in a screenshot:

- **A provider failing never fails the investigation.** Each of the 35 providers runs independently and reports one of six explicit outcomes — success, empty, not configured, rate limited, timeout, or error — and a partial investigation is clearly labelled partial. Nothing gets silently dropped or replaced with a guess.
- **No fabricated intelligence, ever.** If a source has no data, the UI says "No result," not a plausible-looking fake one. This was a hard rule I held to even when it made the product look less impressive in a demo.
- **SSRF-hardened outbound requests.** User-supplied URLs are validated before any network call: scheme allow-listing, a blocked-hostname/suffix list (`localhost`, `.internal`, `metadata.google.internal`, cloud metadata endpoints, `.local`, etc.), DNS-rebinding-safe resolution that classifies every resolved address and refuses anything non-public, an allow-listed port set, embedded credentials stripped before forwarding, and every redirect hop re-validated against the same policy rather than trusting the first check.
- **Schema-validated, defensively-parsed provider responses.** Every external response is parsed with Zod against an explicit schema rather than trusted as-is; when a live API's shape drifted mid-project (twice, in production, on the same week), the fix was to make the schema accept the real observed shape and filter unusable rows — not to guess and hope.
- **Provenance on every fact.** Findings carry their source provider, the rule that produced them, an observed-at timestamp, a confidence value where the source provides one, and references — so a finding in a report can always be traced back to where it came from.
- **Bounded, timed-out, rate-limited by design.** Every outbound request has a byte cap and a timeout; every route enforces per-client rate limits; responses are capped so a single hostile or oversized reply can't exhaust memory.
- **Database persistence done properly.** Schema migrations are tracked and applied explicitly against production rather than assumed — a real production incident this project hit was a migration that existed in the repo but had never actually been run against the live database, silently breaking a feature until it was diagnosed and fixed at the database layer.
- **299 automated tests** (Vitest) covering detection, normalization, provider parsing, correlation, and the security-policy layer itself, plus Playwright browser QA on the actual UI before anything ships.

## Future work

Being honest about what isn't built yet, rather than implying it is:

- Multi-user accounts and role-based access (currently single-operator with an admin token)
- Scheduled/recurring re-investigation of watched observables
- PDF export (Markdown and CSV are implemented; PDF is not)
- Deeper OSINT/identity correlation — deliberately scoped narrowly so far to stay clear of anything resembling a people-search tool

## Portfolio value

Demonstrates the full loop of a real security engineering project: defensive-by-default network code (SSRF hardening, bounded requests), living with unreliable third-party APIs honestly instead of papering over their failures, a genuine correlation/evidence model instead of a list of API results, and the unglamorous production reality of database migrations, rate limits, and monitoring — not just a working demo.

**Repository**: [github.com/NopsFR/Intelligence-Investigation](https://github.com/NopsFR/Intelligence-Investigation) (public) · **Live**: [nops-cyber-intelligence.vercel.app](https://nops-cyber-intelligence.vercel.app)

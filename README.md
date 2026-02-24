
<img width="1352" height="759" alt="saas-wasp" src="https://github.com/user-attachments/assets/9b187bfa-8d38-4e53-b638-401a3bb4dcf1" />

# Framework Token Count & Context Window Efficiency Comparison: Next.js vs Wasp

A side-by-side token count and overall DX comparison of Next.js vs Wasp (a full-stack React, Node.js, and Prisma framework with for the AI era). 

We took [Vercel's official Next.js SaaS starter](https://github.com/nextjs/saas-starter) and ported it as a Wasp app, then measured the token count and overall DX.

# Token Count Comparison: Next.js vs Wasp SaaS Starter

Measured with [tiktoken](https://github.com/openai/tiktoken) across all developer-written source files (excludes `node_modules`, lock files, `.git`, build output, auto-generated migrations).

## Summary

| Metric | Next.js | Wasp | Wasp's reduction over Next.js |
|---|---:|---:|---:|
| Total files | 47 | 32 | 32% |
| Total lines | 3,997 | 2,316 | 42% |
| Total tokens | 30,329 | 18,645 | 39% |
| App-specific tokens (excl shared UI) | 26,325 | 14,973 | 43% |


## Wasp's Token Count Reduction

- **15 files eliminated**
- **11,352 app-specific tokens saved** — 43% less context an AI needs to understand and work with the codebase
- The **biggest savings come from auth** (4,954 → 622 tokens, **87% reduction**) and **database** (3,832 → 440 tokens in `schema.prisma`, **89% reduction**) — Wasp handles all the boilerplate internally.
- App-specific token savings (**43%**) are more meaningful than total savings (39%) because shared UI inflates both sides equally.

## Why Token Count & Context Efficiency Matter in the AI Era

AI coding agents and tools (i.e. LLMs) operate within fixed context windows. Every token of boilerplate, configuration, and glue code that an agent has to ingest is a token *not* spent on understanding your actual business logic. When your codebase is leaner, AI tools can:

- **Understand more of your app at once** 
- **Generate code faster and more accurately** 
- **Generate more complex app code** 

### How Wasp's Config-Driven Approach Helps

Wasp's configuration and structure isn't just a way to reduce boilerplate and token usage, it's a **high-level map of your entire app**. Via the `main.wasp` or `main.wasp.ts` files, an AI agent understands your routes, pages, auth methods, database, operations, and background jobs, all declared in a structured, predictable format.

This means:
1. **Instant app understanding** — instead of crawling numerous files to piece together how the app works, an AI agent reads the config and knows the full architecture and functionality.
2. **Agents work more efficiently** — reduced token usage directly impacts cost and speed. A 40-60% reduction in tokens compounds across every prompt, every edit, and every agent loop, making sure generations stay coherent as the app grows.
3. **Clear guardrails for code generation** — the config defines *where* and *how* code should be written. Operations have typed inputs/outputs, pages have defined routes, entities have schemas. This structure prevents AI tools from generating code that doesn't fit the app's patterns.
4. **Boilerplate code is handled by the framework** — features like auth, middleware, routing, jobs, email sending, and database setup are managed by Wasp, not generated as code. That's less code for AI to read, less code for AI to break, and more accurate code generation for complex features across the entire stack (frontend, backend, database).

## What Wasp Eliminates

| Next.js Files Eliminated | Why Not Needed in Wasp |
|---|---|
| `docker-compose.yml` (local Postgres) | `wasp start db` spins up a managed Postgres container automatically |
| `lib/auth/session.ts` (JWT/cookie handling) | Wasp manages sessions internally via Lucia |
| `lib/auth/middleware.ts` (auth wrappers) | Wasp provides `context.user` on every operation |
| `middleware.ts` (global route protection) | `authRequired: true` on page declarations |
| `lib/db/setup.ts` (interactive env/DB setup) | `wasp start db` manages Postgres; auth secrets are internal; no setup script needed |
| `lib/db/queries.ts` (DB query functions) | Wasp operations access entities directly via `context.entities` |
| `postcss.config.mjs` | Wasp uses `@tailwindcss/vite` plugin — no PostCSS config needed |
| `app/(login)/sign-in/page.tsx`, `sign-up/page.tsx` | Wasp auth route declarations + built-in form components |
| `app/api/team/route.ts`, `app/api/user/route.ts` | Become Wasp queries with automatic API generation |

### Setup & Infrastructure Scripts

The Next.js starter includes `lib/db/setup.ts` (215 lines) — an interactive script that checks for Stripe CLI, provisions a Docker Postgres instance, collects API keys, generates `AUTH_SECRET`, and writes the `.env` file. It also includes `lib/db/seed.ts` (84 lines) that creates a test user, team, and Stripe products.

The setup script has no equivalent in the Wasp version because:

- **Database provisioning**: `wasp start db` spins up a managed Postgres container automatically — no Docker Compose config or setup script needed.
- **Auth secrets**: Wasp generates and manages session secrets internally — no `AUTH_SECRET` env var to configure.
- **Environment setup**: The only env vars needed are `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, set directly in `.env.server`.
- **User/team seeding**: Wasp's `onAfterSignup` hook automatically creates a team and membership when any user signs up — no seed script needed for the core flow.

The Stripe product seeding is handled by Wasp's built-in `db.seeds` feature (`wasp db seed`), which is included in the Wasp token count.

## Category Breakdown

### Next.js (47 files, 30,329 tokens)

| Category | Files | Tokens |
|---|---:|---:|
| config | 8 | 1,345 |
| db | 5 | 3,832 |
| auth | 6 | 4,954 |
| payment | 4 | 2,051 |
| api_routes | 2 | 68 |
| layouts | 4 | 1,922 |
| dashboard_pages | 5 | 4,790 |
| marketing_pages | 4 | 4,353 |
| styles | 2 | 3,010 |
| shared_ui | 7 | 4,004 |

### Wasp (32 files, 18,645 tokens)

| Category | Files | Tokens |
|---|---:|---:|
| config | 6 | 2,463 |
| auth | 2 | 622 |
| operations | 2 | 1,510 |
| payment | 3 | 1,137 |
| layouts | 3 | 1,274 |
| dashboard_pages | 4 | 3,993 |
| marketing_pages | 3 | 2,973 |
| styles | 2 | 1,001 |
| shared_ui | 7 | 3,672 |

## How to Reproduce

```bash
pip install tiktoken
python count_tokens.py
```

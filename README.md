# Framework Comparison: Next.js vs Wasp — Context Efficiency & AI Code Generation

A side-by-side comparison of the same SaaS app built with [Next.js](https://github.com/vercel/next.js) and [Wasp](https://github.com/wasp-lang/wasp) (a full-stack React, Node.js, and Prisma framework for the AI era). 

We measured both the static token count difference *and* the real-world impact on AI code generation — giving Claude Code the same prompt for both apps and comparing how efficiently and accurately it builds a new feature.

## TL;DR

### AI Code Generation Comparison

Same prompt, same model (Claude Opus 4.6), same feature (Team Announcements touching all layers). Measured from Claude Code JSONL session transcripts:


| Metric                       | Next.js   | Wasp      | Wasp's reduction |
| ---------------------------- | --------- | --------- | ---------------- |
| Implementation tokens        | 2,383,297 | 1,407,186 | **41%**          |
| Implementation cost          | $5.83     | $3.49     | **40%**          |
| API turns                    | 62        | 42        | 32%              |
| Wall-clock time              | 3.7m      | 2.6m      | 30%              |
| Output tokens (code written) | 5,416     | 5,395     | ~same            |


### Static Codebase Comparison


| Metric                               | Next.js | Wasp       | Wasp's reduction |
| ------------------------------------ | ------- | ---------- | ---------------- |
| Total files                          | 47      | 32         | 32%              |
| Total lines                          | 3,997   | 2,316      | 42%              |
| Total tokens                         | 30,329  | 18,645     | 39%              |
| App-specific tokens (excl shared UI) | 26,325  | **14,973** | **43%**          |


The 41% token reduction during AI generation tracks almost exactly with the 43% fewer app-specific tokens in the codebase — the smaller context directly translates to fewer tokens consumed per turn.

## What Was Measured



We took [Vercel's official Next.js SaaS starter](https://github.com/nextjs/saas-starter) and rebuilt it as a Wasp app, then measured the token count. All logic was kept intact and only framework-specific changes were made.

Static token count was done with OpenAI's [tiktoken](https://github.com/openai/tiktoken) across all developer-written source files only (excludes `node_modules`, lock files, `.git`, build output, auto-generated migrations). AI generation metrics were extracted from Claude Code session transcripts using `measure_code_generation.py`.

## How to Reproduce

### Static Token Count

```bash
pip install tiktoken
python count_static_tokens.py
```

### AI Generation Measurement

After running identical prompts through Claude Code for each framework (see `[code-generation-test.md](./code-generation-test.md)` for the full test protocol), extract metrics from the session transcripts:

```bash
python measure_code_generation.py <transcript.jsonl> [transcript2.jsonl ...]
```

`measure_code_generation.py` parses Claude Code JSONL session transcripts and reports:

- **Token usage** — input, output, cache read, cache creation (per session and grand total)
- **Cost** — computed from per-model pricing (Opus, Sonnet, Haiku), including subagent estimates
- **Tool use counts** — Read, Edit, Write, Bash, Glob, Grep, Task, etc.
- **Files touched** — unique files read, edited, and created
- **Subagent metrics** — tokens, tool uses, and duration for each spawned subagent
- **Wall-clock time** — derived from first/last timestamps in the transcript

Handles variable session counts (single file or multiple for plan + implement), variable numbers of subagents, and mixed models. Quick side-by-side:

```bash
echo "=== WASP ===" && python3 measure_code_generation.py ~/.claude/projects/*wasp*/*.jsonl
echo "=== NEXT.JS ===" && python3 measure_code_generation.py ~/.claude/projects/*nextjs*/*.jsonl
```

## Wasp's Token Count Reduction

- **15 files eliminated**
- **11,352 app-specific tokens saved** — 43% less context an AI needs to understand and work with the codebase
- Major savings come from **auth** (4,954 → 622 tokens, **87% reduction**) and **database** (3,832 → 440 tokens in `schema.prisma`, **89% reduction**) — Wasp handles all the boilerplate internally.
- **App-specific token savings** (**43%**) are more meaningful than total savings (39%) because shared UI inflates both sides equally.

## Why Token Count & Context Efficiency Matter in the AI Era

AI coding agents and tools (i.e. LLMs) operate within fixed context windows. Every token of boilerplate, configuration, and glue code that an agent has to ingest is a token *not* spent on understanding your actual business logic. What's worse is that as [context windows fill up, agent performance degrades](https://research.trychroma.com/context-rot). So when your codebase is context-efficient, AI tools can:

- **Understand more of your app at once** 
- **Generate code faster and more accurately** 
- **Generate more complex app code**

### How Wasp's Config-Driven Approach Helps

Wasp's configuration and structure isn't just a way to reduce boilerplate and token usage, it's a **high-level map of your entire app**. Via the `[main.wasp` or `main.wasp.ts` files](./wasp/main.wasp), an AI agent understands your routes, pages, auth methods, database, operations, and background jobs, all declared in a structured, predictable format.

This means:

1. **Instant app understanding** — instead of crawling numerous files to piece together how the app works, an AI agent reads the config and knows the full architecture and functionality.
2. **Agents work more efficiently** — reduced token usage directly impacts cost and speed. A 40-60% reduction in tokens compounds across every prompt, every edit, and every agent loop, making sure generations stay coherent as the app grows.
3. **Clear guardrails for code generation** — the config defines *where* and *how* code should be written. Operations have typed inputs/outputs, pages have defined routes, entities have schemas. This structure prevents AI tools from generating code that doesn't fit the app's patterns.
4. **Boilerplate code is handled by the framework** — features like auth, middleware, routing, jobs, email sending, and database setup are managed by Wasp, not generated as code. That's less code for AI to read, less code for AI to break, and more accurate code generation for complex features across the entire stack (frontend, backend, database).

## What Wasp Eliminates


| Next.js Files Eliminated                           | Why Not Needed in Wasp                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `docker-compose.yml` (local Postgres)              | `wasp start db` spins up a managed Postgres container automatically                 |
| `lib/auth/session.ts` (JWT/cookie handling)        | Wasp manages sessions internally via Lucia                                          |
| `lib/auth/middleware.ts` (auth wrappers)           | Wasp provides `context.user` on every operation                                     |
| `middleware.ts` (global route protection)          | `authRequired: true` on page declarations                                           |
| `lib/db/setup.ts` (interactive env/DB setup)       | `wasp start db` manages Postgres; auth secrets are internal; no setup script needed |
| `lib/db/queries.ts` (DB query functions)           | Wasp operations access entities directly via `context.entities`                     |
| `postcss.config.mjs`                               | Wasp uses `@tailwindcss/vite` plugin — no PostCSS config needed                     |
| `app/(login)/sign-in/page.tsx`, `sign-up/page.tsx` | Wasp auth route declarations + built-in form components                             |
| `app/api/team/route.ts`, `app/api/user/route.ts`   | Become Wasp queries with automatic API generation                                   |


### Setup & Infrastructure Scripts

The Next.js starter includes `lib/db/setup.ts` (215 lines) — an interactive script that checks for Stripe CLI, provisions a Docker Postgres instance, collects API keys, generates `AUTH_SECRET`, and writes the `.env` file. It also includes `lib/db/seed.ts` (84 lines) that creates a test user, team, and Stripe products.

The setup script has no equivalent in the Wasp version because:

- **Database provisioning**: `wasp start db` spins up a managed Postgres container automatically — no Docker Compose config or setup script needed.
- **Auth secrets**: Wasp generates and manages session secrets internally — no `AUTH_SECRET` env var to configure.
- **Environment setup**: The only env vars needed are `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, set directly in `.env.server`.
- **User/team seeding**: Wasp's `onAfterSignup` hook automatically creates a team and membership when any user signs up — no seed script needed for the core flow.

The Stripe product seeding is handled by Wasp's built-in `db.seeds` feature (`wasp db seed`), which is included in the Wasp token count.
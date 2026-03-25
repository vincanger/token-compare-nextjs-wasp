# Framework Comparison: Next.js vs Wasp — Context Efficiency & AI Code Generation

A side-by-side comparison of the same SaaS app built with [Next.js](https://github.com/vercel/next.js) and [Wasp](https://github.com/wasp-lang/wasp) (a full-stack React, Node.js, and Prisma framework for the AI era). 

We measured both the static token count difference *and* the real-world impact on AI code generation — giving Claude Code the same prompt for both apps and comparing how efficiently and accurately it builds a new feature.

## TL;DR

### AI Code Generation Comparison

Same prompt, same model (Claude Opus 4.6), same feature (Team Announcements touching all layers). Measured from Claude Code JSONL session transcripts.

#### Implementation Only

| Metric                       | Next.js   | Wasp      | Wasp's reduction |
| ---------------------------- | --------- | --------- | ---------------- |
| Total tokens                 | 2,383,297 | 1,407,186 | **41%**          |
| Cost                         | $1.94     | $1.16     | **40%**          |
| API turns                    | 62        | 42        | 32%              |
| Wall-clock time              | 3.7m      | 2.6m      | 30%              |
| Output tokens (code written) | 5,416     | 5,395     | ~same            |

#### Combined: Planning + Implementation

| Metric              | Next.js   | Wasp      | Wasp's reduction |
| ------------------- | --------- | --------- | ---------------- |
| Total tokens        | 4,049,413 | 2,505,796 | **38%**          |
| Total cost          | $5.17     | $2.87     | **45%**          |
| API turns           | 96        | 66        | 31%              |
| Total tool uses     | 66        | 52        | 21%              |
| Files read          | 15        | 12        | 20%              |

**Where the cost difference comes from:** Output tokens (code the AI *wrote*) were nearly identical — $0.21 vs $0.21. The entire $2.30 cost gap comes from the Next.js codebase being bigger: cache read was 57% more expensive ($1.71 vs $1.09) and cache creation was 113% more expensive ($2.82 vs $1.32). The AI did the same amount of work — it just had to read more to do it.

See the [full benchmarking results](#full-benchmarking-results) for the complete per-phase metrics including tool use counts, subagent details, and cost-by-category breakdowns.


### Static Codebase Comparison


| Metric                               | Next.js | Wasp       | Wasp's reduction |
| ------------------------------------ | ------- | ---------- | ---------------- |
| Total files                          | 47      | 32         | 32%              |
| Total lines                          | 3,997   | 2,499      | 37%              |
| Total tokens                         | 30,329  | 19,601     | 35%              |
| App-specific tokens (excl shared UI) | 26,325  | **15,929** | **40%**          |


The 41% token reduction during implementation tracks closely with the 40% fewer app-specific tokens in the codebase — the smaller context directly translates to fewer tokens consumed per turn.

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
- **10,396 app-specific tokens saved** — 40% less context an AI needs to understand and work with the codebase
- Major savings come from **auth** (4,954 → 911 tokens, **82% reduction**) and **database** (3,832 → 440 tokens in `schema.prisma`, **89% reduction**) — Wasp handles all the boilerplate internally.
- **App-specific token savings** (**40%**) are more meaningful than total savings (35%) because shared UI inflates both sides equally.

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

## Full Benchmarking Results

### Planning Phase

|                        | Wasp                        | Next.js                     | Delta                      |
|------------------------|-----------------------------|-----------------------------|----------------------------|
| Cost                   | $1.71                       | $3.23                       | Next.js 89% more expensive |
| Duration               | 12.3m                       | 11.3m                       | Wasp 9% slower             |
| API turns              | 24                          | 34                          | Next.js 42% more           |
| **Tokens**             |                             |                             |                            |
| Input (non-cache)      | 34                          | 15,938                      |                            |
| Output                 | 3,001                       | 3,125                       |                            |
| Cache read             | 827,154                     | 1,144,621                   | Next.js 38% more           |
| Cache creation         | 154,970                     | 343,217                     | Next.js 121% more          |
| Total (incl subagents) | 1,098,610                   | 1,666,116                   | Next.js 52% more           |
| **Tool uses**          | **16**                      | **21**                      |                            |
| Read                   | 6                           | 8                           |                            |
| Glob                   | 1                           | 3                           |                            |
| Grep                   | 0                           | 1                           |                            |
| Edit                   | 2                           | 1                           |                            |
| Write                  | 1                           | 1                           |                            |
| Task (subagents)       | 3                           | 3                           |                            |
| EnterPlanMode          | 1                           | 1                           |                            |
| ExitPlanMode           | 2                           | 2                           |                            |
| AskUserQuestion        | 0                           | 1                           |                            |
| **Files**              |                             |                             |                            |
| Unique files read      | 6                           | 8                           |                            |
| Files edited           | 1                           | 1                           |                            |
| Files created          | 1                           | 1                           |                            |
| **Subagents**          | **3**                       | **3**                       |                            |
| Subagent #1            | 34,106 tok, 13 tools, 74s   | 46,065 tok, 27 tools, 91s   |                            |
| Subagent #2            | 44,864 tok, 25 tools, 96s   | 53,177 tok, 38 tools, 107s  |                            |
| Subagent #3            | 34,481 tok, 17 tools, 112s  | 59,973 tok, 29 tools, 120s  |                            |
| Subagent total tokens  | 113,451                     | 159,215                     | Next.js 40% more           |
| Subagent est. cost     | $0.25                       | $0.35                       |                            |
| **Cost breakdown**     |                             |                             |                            |
| Input cost             | $0.0002                     | $0.0797                     |                            |
| Output cost            | $0.0750                     | $0.0781                     |                            |
| Cache read cost        | $0.4136                     | $0.5723                     |                            |
| Cache creation cost    | $0.9686                     | $2.1451                     | Next.js 121% more          |
| Main agent cost        | $1.46                       | $2.88                       |                            |
| Subagent cost          | $0.25                       | $0.35                       |                            |

**Key driver: Cache creation cost.** Next.js had 2.2x more cache creation tokens (343K vs 155K), at $6.25/M that's $2.15 vs $0.97 — a $1.18 difference that accounts for most of the gap. The bigger codebase means more new content being loaded into cache.

---

### Implementation Phase

|                     | Wasp      | Next.js   | Delta                                    |
|---------------------|-----------|-----------|------------------------------------------|
| Cost                | $1.16     | $1.94     | Next.js 67% more expensive               |
| Duration            | 2.6m      | 3.7m      | Next.js 42% slower                       |
| API turns           | 42        | 62        | Next.js 48% more                         |
| **Tokens**          |           |           |                                          |
| Input (non-cache)   | 54        | 76        |                                          |
| Output              | 5,395     | 5,416     | Nearly identical                         |
| Cache read          | 1,345,037 | 2,270,077 | Next.js 69% more                         |
| Cache creation      | 56,700    | 107,728   | Next.js 90% more                         |
| Total               | 1,407,186 | 2,383,297 | Next.js 69% more                         |
| **Tool uses**       | **36**    | **45**    | **Next.js 25% more**                     |
| Read                | 6         | 8         |                                          |
| Edit                | 14        | 14        | Same                                     |
| Write               | 1         | 2         |                                          |
| Bash                | 0         | 4         | Next.js needed shell commands            |
| Glob                | 0         | 2         |                                          |
| TaskCreate          | 5         | 5         | Same                                     |
| TaskUpdate          | 10        | 10        | Same                                     |
| **Files**           |           |           |                                          |
| Unique files read   | 6         | 7         |                                          |
| Files edited        | 5         | 5         | Same                                     |
| Files created       | 1         | 2         | Next.js needed an extra file (API route) |
| Subagents           | 0         | 0         |                                          |
| **Cost breakdown**  |           |           |                                          |
| Input cost          | $0.0003   | $0.0004   |                                          |
| Output cost         | $0.1349   | $0.1354   | Nearly identical                         |
| Cache read cost     | $0.6725   | $1.1350   | Next.js 69% more                         |
| Cache creation cost | $0.3544   | $0.6733   | Next.js 90% more                         |

**Key driver: Cache read cost.** With 62 API turns vs 42, each turn re-reads the growing context. The Next.js codebase is bigger so each read costs more — $1.14 vs $0.67. Output tokens were nearly identical (~5,400), meaning the AI wrote roughly the same amount of code but had to read far more to do it.

---

### Combined: Plan + Implementation

|                      | Wasp      | Next.js   | Delta                      |
|----------------------|-----------|-----------|----------------------------|
| Total cost           | $2.87     | $5.17     | Next.js 80% more expensive |
| Total duration       | 14.9m     | 15.0m     | Nearly identical           |
| Total API turns      | 66        | 96        | Next.js 45% more           |
| Total tokens         | 2,505,796 | 4,049,413 | Next.js 62% more           |
| Total tool uses      | 52        | 66        | Next.js 27% more           |
| Subagents spawned    | 3         | 3         | Same                       |
| Unique files read    | 12        | 15        |                            |
| Files edited         | 6         | 6         | Same                       |
| Files created        | 2         | 3         |                            |
| **Cost by category** |           |           |                            |
| Input                | $0.0005   | $0.0801   |                            |
| Output               | $0.2099   | $0.2135   | Nearly identical           |
| Cache read           | $1.0861   | $1.7073   | Next.js 57% more           |
| Cache creation       | $1.3230   | $2.8184   | Next.js 113% more          |
| Subagent             | $0.25     | $0.35     |                            |

**The story in three numbers:**
- **Output tokens** (what the AI wrote): nearly identical — $0.21 vs $0.21
- **Cache read** (what the AI re-read each turn): Next.js 57% more — $1.71 vs $1.09
- **Cache creation** (what the AI first loaded): Next.js 113% more — $2.82 vs $1.32

The AI did roughly the same amount of work for both frameworks. The entire cost difference ($2.30) comes from the Next.js codebase being bigger, meaning more tokens to load and re-read across every single API turn.

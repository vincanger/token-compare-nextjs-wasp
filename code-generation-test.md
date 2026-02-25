# AI Code Generation Comparison: Next.js vs Wasp

## Context

You already have a token count comparison for app-specific tokens. The next step is to give the same AI (Claude Code) the same prompt for both apps and compare how efficiently and accurately it builds a new feature. 

## The Test Feature: Team Announcements

A new "Announcements" feature for teams — touches all layers (schema → backend → frontend → routing → nav) and produces a visually clear result for video.

## The Prompt (Identical for Both)

```
Add a Team Announcements feature to this app.

1. DATA MODEL: Create an Announcement entity/table with these fields:
   - id: auto-increment integer primary key
   - teamId: foreign key to Team (required)
   - userId: foreign key to User (the author, required)
   - title: string, required
   - content: text, required
   - createdAt: timestamp, defaults to now

2. BACKEND: Create two operations:
   - getAnnouncements: fetch all announcements for the current user's team, ordered by createdAt descending, include the author's name. Requires auth.
   - createAnnouncement: accepts { title: string, content: string }, creates announcement for the user's team, logs activity with action "CREATE_ANNOUNCEMENT". Requires auth.

3. FRONTEND: Create a new dashboard page at /dashboard/announcements that:
   - Lists announcements in Card components showing title, content, author name, and relative time
   - Has a form at the top to post a new announcement (title input, content textarea, submit button)
   - Shows loading and empty states
   - Uses the existing dashboard layout, styling, and component patterns

4. NAVIGATION: Add "Announcements" to the dashboard sidebar nav using the Megaphone icon from lucide-react, between "Team" and "General".

5. ACTIVITY: Add CREATE_ANNOUNCEMENT as a new logged activity type.

Follow the existing patterns in the codebase for all of the above.
```

**Note:** No framework-specific terms — says "entity/table", "operations", "page", never mentions Wasp/Next.js/Prisma/Drizzle/server actions.

## Test Protocol

### Pre-Flight Checklist

1. **Clean git state** — create a branch in each project:
   ```
   cd saas-comparison/wasp && git checkout -b test/announcements-wasp
   cd saas-comparison/nextjs && git checkout -b test/announcements-nextjs
   ```
2. **Verify both apps build** — `wasp compile` and `npm run build` (baseline: no pre-existing errors)
3. **Verify `Megaphone` icon exists** — check both `node_modules/lucide-react` directories
5. **Confirm same model** — check settings, use same model for both runs
6. **Save prompt in a text file** — copy-paste character-for-character, no retyping
7. **Database running** — both apps should start with a seeded user + team

### Execution (for each framework)

1. `cd` into the project directory
2. Start a **fresh** Claude Code session (no prior context)
3. Paste the exact prompt
5. **Do not intervene** — no follow-ups, no corrections, no hints
6. When Claude says "done", ask it to run the [post session measurement guide](#post-session-measurement-guide).
7. Make sure each app compiles and the feature works.

## Post-Session Measurement Guide

After each framework's session completes, extract metrics from the Claude Code JSONL transcript files. These are stored at:

```
~/.claude/projects/-<mangled-cwd>/<session-id>.jsonl
```

The `<mangled-cwd>` replaces `/` with `-` from the absolute project path. For example:
- Wasp:   `~/.claude/projects/-Users-you-...-saas-comparison-wasp/`
- Next.js: `~/.claude/projects/-Users-you-...-saas-comparison-nextjs/`

Each session produces one JSONL file named by its session UUID. If you used plan mode, the planning session and implementation session are **separate files** (separate UUIDs). Identify them by timestamp or by inspecting the first few lines.

### Token Metrics Extraction Script

Use `measure_code_generation.py` at the repo root to extract the metrics from the JSONL transcript files. For example:

```bash
# Single session (no plan mode):
python3 measure_code_generation.py ~/.claude/projects/-...-nextjs/abc123.jsonl

# Plan + implementation (two sessions):
python3 measure_code_generation.py ~/.claude/projects/-...-wasp/plan-uuid.jsonl ~/.claude/projects/-...-wasp/impl-uuid.jsonl
```

### Quick Comparison One-Liner

After running both frameworks, compare side-by-side:

```bash
echo "=== WASP ===" && python3 measure_code_generation.py ~/.claude/projects/*wasp*/*.jsonl
echo ""
echo "=== NEXT.JS ===" && python3 measure_code_generation.py ~/.claude/projects/*nextjs*/*.jsonl
```

**Caveat**: The `*.jsonl` glob picks up ALL sessions in that project directory. If you have prior sessions, either clean the directory first or pass specific file paths.

## Fairness Concerns to Acknowledge

2. **Training data favors Next.js** — Claude has seen far more Next.js code.
3. **Codebase size** — Wasp has 40% fewer tokens to read. This is the point, not a confound.

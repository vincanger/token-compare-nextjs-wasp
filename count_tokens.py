#!/usr/bin/env python3
"""Token count comparison between Next.js and Wasp SaaS starters.

Uses the gpt-4 (cl100k_base) tokenizer. This encoding is shared across
GPT-4, GPT-4 Turbo, and GPT-4o — the relative reduction between projects
is effectively the same regardless of tokenizer, since both codebases
contain the same kind of content (TypeScript, config files, CSS).
"""

import os
import tiktoken

enc = tiktoken.encoding_for_model("gpt-4")

# ── File lists ────────────────────────────────────────────────
# Only source files a developer writes/maintains.
# Excludes: node_modules, lock files, .git, build output, READMEs, .gitignore, etc.

NEXTJS_ROOT = "nextjs"
WASP_ROOT = "wasp"

NEXTJS_FILES = {
    "config": [
        "next.config.ts",
        "tsconfig.json",
        "drizzle.config.ts",
        "postcss.config.mjs",
        "package.json",
        "components.json",
        "middleware.ts",
        "docker-compose.yml",
    ],
    "db": [
        "lib/db/schema.ts",
        "lib/db/drizzle.ts",
        "lib/db/setup.ts",
        "lib/db/seed.ts",
        "lib/db/queries.ts",
    ],
    "auth": [
        "lib/auth/session.ts",
        "lib/auth/middleware.ts",
        "app/(login)/actions.ts",
        "app/(login)/login.tsx",
        "app/(login)/sign-in/page.tsx",
        "app/(login)/sign-up/page.tsx",
    ],
    "payment": [
        "lib/payments/stripe.ts",
        "lib/payments/actions.ts",
        "app/api/stripe/checkout/route.ts",
        "app/api/stripe/webhook/route.ts",
    ],
    "api_routes": [
        "app/api/team/route.ts",
        "app/api/user/route.ts",
    ],
    "layouts": [
        "app/layout.tsx",
        "app/(dashboard)/layout.tsx",
        "app/(dashboard)/dashboard/layout.tsx",
        "app/not-found.tsx",
    ],
    "dashboard_pages": [
        "app/(dashboard)/dashboard/page.tsx",
        "app/(dashboard)/dashboard/general/page.tsx",
        "app/(dashboard)/dashboard/security/page.tsx",
        "app/(dashboard)/dashboard/activity/page.tsx",
        "app/(dashboard)/dashboard/activity/loading.tsx",
    ],
    "marketing_pages": [
        "app/(dashboard)/page.tsx",
        "app/(dashboard)/pricing/page.tsx",
        "app/(dashboard)/pricing/submit-button.tsx",
        "app/(dashboard)/terminal.tsx",
    ],
    "styles": [
        "app/globals.css",
        "lib/utils.ts",
    ],
    "shared_ui": [
        "components/ui/avatar.tsx",
        "components/ui/button.tsx",
        "components/ui/card.tsx",
        "components/ui/dropdown-menu.tsx",
        "components/ui/input.tsx",
        "components/ui/label.tsx",
        "components/ui/radio-group.tsx",
    ],
}

WASP_FILES = {
    "config": [
        "main.wasp",
        "schema.prisma",
        "vite.config.ts",
        "tsconfig.json",
        "package.json",
        "components.json",
    ],
    "auth": [
        "src/auth/AuthPages.tsx",
        "src/auth/hooks.ts",
    ],
    "operations": [
        "src/operations.ts",
        "src/dbSeeds.ts",
    ],
    "payment": [
        "src/payment/stripe.ts",
        "src/payment/operations.ts",
        "src/payment/webhook.ts",
    ],
    "layouts": [
        "src/Root.tsx",
        "src/MainLayout.tsx",
        "src/dashboard/DashboardLayout.tsx",
    ],
    "dashboard_pages": [
        "src/dashboard/DashboardPage.tsx",
        "src/dashboard/GeneralPage.tsx",
        "src/dashboard/SecurityPage.tsx",
        "src/dashboard/ActivityPage.tsx",
    ],
    "marketing_pages": [
        "src/landing/LandingPage.tsx",
        "src/landing/PricingPage.tsx",
        "src/landing/Terminal.tsx",
    ],
    "styles": [
        "src/globals.css",
        "src/lib/utils.ts",
    ],
    "shared_ui": [
        "src/components/ui/avatar.tsx",
        "src/components/ui/button.tsx",
        "src/components/ui/card.tsx",
        "src/components/ui/dropdown-menu.tsx",
        "src/components/ui/input.tsx",
        "src/components/ui/label.tsx",
        "src/components/ui/radio-group.tsx",
    ],
}


def count_tokens(filepath):
    try:
        with open(filepath, "r") as f:
            content = f.read()
        tokens = len(enc.encode(content))
        lines = content.count("\n") + (1 if content and not content.endswith("\n") else 0)
        return tokens, lines, len(content)
    except FileNotFoundError:
        return 0, 0, 0


def count_category(root, files):
    total_tokens = 0
    total_lines = 0
    total_chars = 0
    details = []
    for f in files:
        path = os.path.join(root, f)
        tokens, lines, chars = count_tokens(path)
        total_tokens += tokens
        total_lines += lines
        total_chars += chars
        details.append((f, tokens, lines))
    return total_tokens, total_lines, total_chars, details


def print_report(name, root, file_map):
    print(f"\n{'='*70}")
    print(f"  {name}")
    print(f"{'='*70}")

    grand_tokens = 0
    grand_lines = 0
    grand_files = 0
    app_tokens = 0  # excludes shared_ui

    for category, files in file_map.items():
        tokens, lines, chars, details = count_category(root, files)
        grand_tokens += tokens
        grand_lines += lines
        grand_files += len(files)
        if category != "shared_ui":
            app_tokens += tokens

        print(f"\n  {category} ({len(files)} files, {tokens:,} tokens, {lines:,} lines)")
        for f, t, l in details:
            print(f"    {f:55s} {t:>5,} tok  {l:>4} lines")

    print(f"\n  {'─'*60}")
    print(f"  TOTAL:  {grand_files} files | {grand_tokens:,} tokens | {grand_lines:,} lines")
    print(f"  APP-SPECIFIC (excl shared UI): {app_tokens:,} tokens")

    return grand_tokens, app_tokens, grand_files, grand_lines


print("\n" + "█"*70)
print("  TOKEN COUNT COMPARISON: Next.js vs Wasp SaaS Starter")
print("█"*70)

nj_total, nj_app, nj_files, nj_lines = print_report("NEXT.JS SaaS Starter", NEXTJS_ROOT, NEXTJS_FILES)
w_total, w_app, w_files, w_lines = print_report("WASP SaaS Starter", WASP_ROOT, WASP_FILES)

print(f"\n{'='*70}")
print(f"  COMPARISON SUMMARY")
print(f"{'='*70}")
print(f"")
print(f"  {'Metric':<35s} {'Next.js':>10s} {'Wasp':>10s} {'Reduction':>12s}")
print(f"  {'─'*67}")
print(f"  {'Total files':<35s} {nj_files:>10,} {w_files:>10,} {(1 - w_files/nj_files)*100:>10.0f}%")
print(f"  {'Total lines':<35s} {nj_lines:>10,} {w_lines:>10,} {(1 - w_lines/nj_lines)*100:>10.0f}%")
print(f"  {'Total tokens':<35s} {nj_total:>10,} {w_total:>10,} {(1 - w_total/nj_total)*100:>10.0f}%")
print(f"  {'App-specific tokens (excl UI lib)':<35s} {nj_app:>10,} {w_app:>10,} {(1 - w_app/nj_app)*100:>10.0f}%")
print(f"  {'─'*67}")
print(f"  {'Files eliminated by Wasp':<35s} {nj_files - w_files:>10,}")
print(f"  {'Token savings':<35s} {nj_total - w_total:>10,}")
print(f"  {'App-specific token savings':<35s} {nj_app - w_app:>10,}")
print()

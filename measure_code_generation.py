#!/usr/bin/env python3
"""Extract token usage, cost, and tool metrics from Claude Code JSONL transcripts.

Handles any number of sessions (plan-only, implement-only, plan+implement).
Handles any number of subagents (0, 1, 5, etc.) and any model mix.
"""
import json, sys, os
from datetime import datetime

# ── Pricing (per 1M tokens) ──────────────────────────────────
PRICING = {
    "claude-opus-4-6":   {"input": 15.0,  "output": 75.0,  "cache_read": 1.50,   "cache_create": 18.75},
    "claude-sonnet-4-6": {"input": 3.0,   "output": 15.0,  "cache_read": 0.30,   "cache_create": 3.75},
    "claude-haiku-4-5":  {"input": 0.80,  "output": 4.0,   "cache_read": 0.08,   "cache_create": 1.00},
}

def match_pricing(model_str):
    """Match a model ID string to its pricing tier."""
    for key in PRICING:
        if key in model_str:
            return PRICING[key]
    # Default: assume most expensive (opus) so estimates are conservative
    return PRICING["claude-opus-4-6"]

def analyze_transcript(filepath):
    """Parse one JSONL transcript and return a metrics dict."""
    with open(filepath) as f:
        lines = f.readlines()

    metrics = {
        "file": os.path.basename(filepath),
        "model": "unknown",
        "api_turns": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_read_tokens": 0,
        "cache_creation_tokens": 0,
        "tool_counts": {},
        "files_read": [],
        "files_written": [],
        "files_edited": [],
        "subagents": [],
        "first_ts": None,
        "last_ts": None,
    }

    for line in lines:
        data = json.loads(line)
        msg_type = data.get("type", "")
        ts = data.get("timestamp")
        if ts:
            if not metrics["first_ts"]:
                metrics["first_ts"] = ts
            metrics["last_ts"] = ts

        if msg_type == "assistant":
            msg = data.get("message", {})

            # Token usage
            if "usage" in msg:
                u = msg["usage"]
                metrics["api_turns"] += 1
                metrics["input_tokens"] += u.get("input_tokens", 0)
                metrics["output_tokens"] += u.get("output_tokens", 0)
                metrics["cache_read_tokens"] += u.get("cache_read_input_tokens", 0)
                metrics["cache_creation_tokens"] += u.get("cache_creation_input_tokens", 0)
                metrics["model"] = msg.get("model", metrics["model"])

            # Tool uses
            content = msg.get("content", [])
            if isinstance(content, list):
                for block in content:
                    if not isinstance(block, dict) or block.get("type") != "tool_use":
                        continue
                    name = block.get("name", "unknown")
                    metrics["tool_counts"][name] = metrics["tool_counts"].get(name, 0) + 1
                    inp = block.get("input", {})
                    if name == "Read":
                        metrics["files_read"].append(inp.get("file_path", ""))
                    elif name == "Write":
                        metrics["files_written"].append(inp.get("file_path", ""))
                    elif name == "Edit":
                        metrics["files_edited"].append(inp.get("file_path", ""))

        # Subagent results (in tool_result blocks from user messages)
        if msg_type == "user":
            msg = data.get("message", {})
            if isinstance(msg, dict):
                content = msg.get("content", [])
                if isinstance(content, list):
                    for block in content:
                        if not isinstance(block, dict) or block.get("type") != "tool_result":
                            continue
                        rc = block.get("content", "")
                        if isinstance(rc, list):
                            for rb in rc:
                                if isinstance(rb, dict) and "text" in rb and "<usage>" in rb["text"]:
                                    txt = rb["text"]
                                    usage_start = txt.index("<usage>") + len("<usage>")
                                    usage_end = txt.index("</usage>")
                                    usage_block = txt[usage_start:usage_end].strip()
                                    sa = {}
                                    for ul in usage_block.split("\n"):
                                        k, _, v = ul.partition(":")
                                        sa[k.strip()] = v.strip()
                                    metrics["subagents"].append(sa)

    # Compute duration
    if metrics["first_ts"] and metrics["last_ts"]:
        try:
            t1 = datetime.fromisoformat(metrics["first_ts"].replace("Z", "+00:00"))
            t2 = datetime.fromisoformat(metrics["last_ts"].replace("Z", "+00:00"))
            metrics["duration_s"] = (t2 - t1).total_seconds()
        except Exception:
            metrics["duration_s"] = None
    else:
        metrics["duration_s"] = None

    return metrics

def compute_cost(m):
    """Compute dollar cost for a metrics dict (main agent only)."""
    p = match_pricing(m["model"])
    return (
        (m["input_tokens"]          / 1e6) * p["input"]
      + (m["output_tokens"]         / 1e6) * p["output"]
      + (m["cache_read_tokens"]     / 1e6) * p["cache_read"]
      + (m["cache_creation_tokens"] / 1e6) * p["cache_create"]
    )

def estimate_subagent_cost(subagents):
    """Rough estimate — subagents only report total_tokens, not breakdown.
    Assumes ~70% input / ~30% output. Uses haiku pricing (most subagents are Explore)."""
    p = PRICING["claude-haiku-4-5"]
    total = 0.0
    for sa in subagents:
        tokens = int(sa.get("total_tokens", 0))
        total += (tokens * 0.7 / 1e6) * p["input"] + (tokens * 0.3 / 1e6) * p["output"]
    return total

def print_report(sessions):
    grand = {
        "input": 0, "output": 0, "cache_read": 0, "cache_create": 0,
        "cost": 0.0, "subagent_tokens": 0, "subagent_cost": 0.0,
        "duration": 0.0, "api_turns": 0, "tool_uses": 0,
        "subagent_count": 0, "files_read": set(), "files_edited": set(),
        "files_written": set(),
    }
    all_tool_counts = {}

    for i, m in enumerate(sessions):
        label = f"Session {i+1}: {m['file']}"
        cost = compute_cost(m)
        sa_cost = estimate_subagent_cost(m["subagents"])
        sa_tokens = sum(int(sa.get("total_tokens", 0)) for sa in m["subagents"])

        print(f"\n{'=' * 65}")
        print(f"  {label}")
        print(f"  Model: {m['model']}  |  API turns: {m['api_turns']}  |  Duration: {m['duration_s']:.0f}s ({m['duration_s']/60:.1f}m)" if m["duration_s"] else f"  Model: {m['model']}  |  API turns: {m['api_turns']}")
        print(f"{'=' * 65}")
        print(f"  {'Category':<25} {'Tokens':>12}   {'Cost':>10}")
        print(f"  {'-'*25} {'-'*12}   {'-'*10}")
        print(f"  {'Input (non-cache)':<25} {m['input_tokens']:>12,}   ${(m['input_tokens']/1e6)*match_pricing(m['model'])['input']:>9.4f}")
        print(f"  {'Output':<25} {m['output_tokens']:>12,}   ${(m['output_tokens']/1e6)*match_pricing(m['model'])['output']:>9.4f}")
        print(f"  {'Cache read':<25} {m['cache_read_tokens']:>12,}   ${(m['cache_read_tokens']/1e6)*match_pricing(m['model'])['cache_read']:>9.4f}")
        print(f"  {'Cache creation':<25} {m['cache_creation_tokens']:>12,}   ${(m['cache_creation_tokens']/1e6)*match_pricing(m['model'])['cache_create']:>9.4f}")
        print(f"  {'Main agent subtotal':<25} {'':>12}   ${cost:>9.4f}")

        if m["subagents"]:
            print(f"\n  Subagents ({len(m['subagents'])}):")
            for j, sa in enumerate(m["subagents"]):
                t = int(sa.get("total_tokens", 0))
                u = int(sa.get("tool_uses", 0))
                d = int(sa.get("duration_ms", 0)) / 1000
                print(f"    #{j+1}: {t:,} tokens, {u} tool uses, {d:.0f}s")
            print(f"    Subagent est. cost: ${sa_cost:.4f}")

        tool_total = sum(m["tool_counts"].values())
        print(f"\n  Tool uses ({tool_total} total): {dict(sorted(m['tool_counts'].items()))}")
        print(f"  Unique files read: {len(set(m['files_read']))}")
        print(f"  Unique files edited: {len(set(m['files_edited']))}")
        print(f"  Files created: {len(set(m['files_written']))}")

        # Accumulate
        grand["input"] += m["input_tokens"]
        grand["output"] += m["output_tokens"]
        grand["cache_read"] += m["cache_read_tokens"]
        grand["cache_create"] += m["cache_creation_tokens"]
        grand["cost"] += cost
        grand["subagent_tokens"] += sa_tokens
        grand["subagent_cost"] += sa_cost
        grand["api_turns"] += m["api_turns"]
        grand["tool_uses"] += tool_total
        grand["subagent_count"] += len(m["subagents"])
        grand["files_read"].update(m["files_read"])
        grand["files_edited"].update(m["files_edited"])
        grand["files_written"].update(m["files_written"])
        if m["duration_s"]:
            grand["duration"] += m["duration_s"]
        for k, v in m["tool_counts"].items():
            all_tool_counts[k] = all_tool_counts.get(k, 0) + v

    # Grand total
    total_cost = grand["cost"] + grand["subagent_cost"]
    all_tokens = grand["input"] + grand["output"] + grand["cache_read"] + grand["cache_create"] + grand["subagent_tokens"]
    print(f"\n{'=' * 65}")
    print(f"  GRAND TOTAL ({len(sessions)} session{'s' if len(sessions)>1 else ''})")
    print(f"{'=' * 65}")
    print(f"  Total tokens:           {all_tokens:>12,}")
    print(f"  Total API turns:        {grand['api_turns']:>12}")
    print(f"  Total tool uses:        {grand['tool_uses']:>12}")
    print(f"  Subagents spawned:      {grand['subagent_count']:>12}")
    print(f"  Unique files read:      {len(grand['files_read']):>12}")
    print(f"  Unique files edited:    {len(grand['files_edited']):>12}")
    print(f"  Files created:          {len(grand['files_written']):>12}")
    print(f"  Wall-clock time:        {grand['duration']/60:>11.1f}m")
    print(f"  Main agent cost:        ${grand['cost']:>11.4f}")
    print(f"  Subagent cost (est):    ${grand['subagent_cost']:>11.4f}")
    print(f"  TOTAL COST:             ${total_cost:>11.4f}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <transcript.jsonl> [transcript2.jsonl ...]")
        sys.exit(1)
    sessions = [analyze_transcript(f) for f in sys.argv[1:]]
    print_report(sessions)
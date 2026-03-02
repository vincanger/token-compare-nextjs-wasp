#!/usr/bin/env python3
"""Extract token usage, cost, and tool metrics from Claude Code JSONL transcripts.

Handles any number of sessions (plan-only, implement-only, plan+implement).
Handles any number of subagents (0, 1, 5, etc.) and any model mix.

Usage:
  python3 measure_code_generation.py <transcript.jsonl> [transcript2.jsonl ...]
  python3 measure_code_generation.py --end-timestamp 2026-02-25T19:12:00Z <file.jsonl>
"""
import json, sys, os, argparse, glob
from datetime import datetime

# ── Pricing (per 1M tokens, 5-min cache tier) ────────────────
# Source: https://www.anthropic.com/pricing (March 2026)
PRICING = {
    "claude-opus-4-6":   {"input": 5.0,   "output": 25.0,  "cache_read": 0.50,   "cache_create": 6.25},
    "claude-sonnet-4-6": {"input": 3.0,   "output": 15.0,  "cache_read": 0.30,   "cache_create": 3.75},
    "claude-haiku-4-5":  {"input": 1.0,   "output": 5.0,   "cache_read": 0.10,   "cache_create": 1.25},
}

def match_pricing(model_str):
    """Match a model ID string to its pricing tier."""
    for key in PRICING:
        if key in model_str:
            return PRICING[key]
    # Default: assume most expensive (opus) so estimates are conservative
    return PRICING["claude-opus-4-6"]

def parse_ts(ts_str):
    """Parse an ISO timestamp string to a datetime object."""
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))


def analyze_transcript(filepath, end_timestamp=None):
    """Parse one JSONL transcript and return a metrics dict.

    Args:
        filepath: Path to the JSONL transcript file.
        end_timestamp: Optional ISO timestamp string. Lines after this time
                       are ignored, preventing post-implementation conversation
                       from contaminating the metrics.
    """
    with open(filepath) as f:
        lines = f.readlines()

    end_dt = parse_ts(end_timestamp) if end_timestamp else None

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

        # Skip lines past the cutoff timestamp
        if ts and end_dt:
            try:
                if parse_ts(ts) > end_dt:
                    break
            except Exception:
                pass

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

def find_subagent_files(transcript_path):
    """Find subagent JSONL files for a given session transcript.

    Subagent files live at <session-id>/subagents/*.jsonl adjacent to the
    main transcript file.  Returns sorted list of paths, or [].
    """
    base = os.path.splitext(os.path.basename(os.path.abspath(transcript_path)))[0]
    parent = os.path.dirname(os.path.abspath(transcript_path))
    sa_dir = os.path.join(parent, base, "subagents")
    if os.path.isdir(sa_dir):
        return sorted(glob.glob(os.path.join(sa_dir, "*.jsonl")))
    return []

def compute_subagent_cost(subagent_metrics):
    """Compute exact cost from parsed subagent JSONL data."""
    return sum(compute_cost(sa) for sa in subagent_metrics)

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
        sa_parsed = m.get("subagent_metrics", [])
        sa_cost = compute_subagent_cost(sa_parsed) if sa_parsed else 0.0
        sa_tokens = sum(
            sa["input_tokens"] + sa["output_tokens"] + sa["cache_read_tokens"] + sa["cache_creation_tokens"]
            for sa in sa_parsed
        ) if sa_parsed else 0

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

        if sa_parsed:
            print(f"\n  Subagents ({len(sa_parsed)}):")
            for j, sa in enumerate(sa_parsed):
                sa_total = sa["input_tokens"] + sa["output_tokens"] + sa["cache_read_tokens"] + sa["cache_creation_tokens"]
                sa_item_cost = compute_cost(sa)
                sa_tools = sum(sa["tool_counts"].values())
                sa_dur = f", {sa['duration_s']:.0f}s" if sa.get("duration_s") else ""
                print(f"    #{j+1}: {sa['model']}  {sa_total:,} tokens, {sa_tools} tool uses{sa_dur}  ${sa_item_cost:.4f}")
            print(f"    Subagent total cost: ${sa_cost:.4f}")
        elif m["subagents"]:
            # Fallback: <usage> blocks only (no subagent JSONL files found)
            print(f"\n  Subagents ({len(m['subagents'])}) [estimated — no JSONL files found]:")
            for j, sa in enumerate(m["subagents"]):
                t = int(sa.get("total_tokens", 0))
                u = int(sa.get("tool_uses", 0))
                d = int(sa.get("duration_ms", 0)) / 1000
                print(f"    #{j+1}: {t:,} tokens, {u} tool uses, {d:.0f}s")

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
        grand["subagent_count"] += len(sa_parsed) or len(m["subagents"])
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
    print(f"  Subagent cost:          ${grand['subagent_cost']:>11.4f}")
    print(f"  TOTAL COST:             ${total_cost:>11.4f}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Extract token usage, cost, and tool metrics from Claude Code JSONL transcripts."
    )
    parser.add_argument("transcripts", nargs="+", help="JSONL transcript file(s)")
    parser.add_argument(
        "--end-timestamp",
        help="ISO timestamp cutoff (e.g. 2026-02-25T19:12:00Z). "
             "Lines after this time are ignored. Use this to exclude "
             "post-implementation conversation from a session that continued.",
    )
    args = parser.parse_args()
    sessions = []
    for f in args.transcripts:
        m = analyze_transcript(f, end_timestamp=args.end_timestamp)
        # Parse subagent JSONL files for exact cost (fall back to <usage> blocks)
        sa_files = find_subagent_files(f)
        if sa_files:
            m["subagent_metrics"] = [analyze_transcript(sf) for sf in sa_files]
        sessions.append(m)
    print_report(sessions)
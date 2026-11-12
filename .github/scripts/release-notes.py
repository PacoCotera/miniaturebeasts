#!/usr/bin/env python3
"""Release title and notes from the merged pull request behind a commit.

usage: release-notes.py <sha> <title-out> <notes-out> [--repo owner/name] [--pr-json file]

Title: the pull request's title. Notes: its "## What changed" list (and
"## Shown as stand-ins for now" when present); a body without those headings is
used whole. Lines that name tools, models, vendors, job ids or desks are
dropped, so only plain player-facing words stay. A commit with no pull request
gets "Update <date>" and only the deploy note.
"""
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

KEEP_HEADINGS = ("what changed", "shown as stand-ins for now")
# Words that never belong in public notes.
INTERNAL = re.compile(
    r"\b(gate|builder|bots?|desk|mibi-art|queue|claude|sonnet|opus|haiku|fable|anthropic|"
    r"nano banana|gemini|gpt|flux|retro diffusion|midjourney|openai|"
    r"ci|goldens?|flakes?|playwright|node tests?|art director|"
    r"brief|\[art\]|\[build\])\b|\b[0-9a-f]{7,12}\b|\b[a-z]+-[a-z]+-\d+\b",
    re.I,
)


def gh(*args):
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


def sections(body):
    """Split a body into (heading or None, lines) parts."""
    parts, head, buf = [], None, []
    for line in body.splitlines():
        m = re.match(r"^##\s+(.*?)\s*$", line)
        if m:
            parts.append((head, buf))
            head, buf = m.group(1), []
        else:
            buf.append(line)
    parts.append((head, buf))
    return parts


def clean(lines):
    out = []
    for line in lines:
        if INTERNAL.search(line):
            continue
        out.append(line.rstrip())
    text = "\n".join(out)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def notes_from(body):
    parts = sections(body or "")
    wanted = [(h, l) for h, l in parts if h and h.lower() in KEEP_HEADINGS]
    chunks = []
    if wanted:
        for h, l in wanted:
            c = clean(l)
            if c:
                chunks.append(f"## {h}\n\n{c}")
    else:
        c = clean([l for _, ls in parts for l in ls])
        if c:
            chunks.append(c)
    return "\n\n".join(chunks)


def main():
    argv = sys.argv[1:]
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    pr_json = None
    if "--repo" in argv:
        i = argv.index("--repo")
        repo = argv[i + 1]
        del argv[i:i + 2]
    if "--pr-json" in argv:
        i = argv.index("--pr-json")
        pr_json = argv[i + 1]
        del argv[i:i + 2]
    sha, title_out, notes_out = argv
    note = (
        f"Tested site + prototypes at {sha}. "
        "The sandbox server installs the newest sandbox-* release. "
        f"Older releases: https://github.com/{repo}/blob/main/CHANGELOG.md"
    )
    if pr_json:
        pr = json.load(open(pr_json))
    else:
        found = json.loads(gh("api", f"repos/{repo}/commits/{sha}/pulls"))
        pr = None
        for p in found:
            if p.get("merged_at") and p["title"].startswith("Release "):
                pr = p
                break
        if pr is None and found:
            pr = found[0]
    if pr:
        title = re.sub(r"\s*\(#\d+\)$", "", pr["title"]).strip()
        body = notes_from(pr.get("body") or "")
        notes = (body + "\n\n" if body else "") + note
    else:
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        title, notes = f"Update {day}", note
    open(title_out, "w").write(title + "\n")
    open(notes_out, "w").write(notes + "\n")


main()

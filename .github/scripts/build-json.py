#!/usr/bin/env python3
"""Writes the site's build.json: commit, short, built, and the release number and name.

usage: build-json.py <sha> <out-file>

The number is "version" and the optional milestone name is "releaseName" in
prototypes/package.json, the one place a release number is set (0.minor.patch:
minor = a playable step, patch = fixes only, 1.0.0 = the first public playtest).
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sha, out = sys.argv[1:3]
pkg = json.load(open(Path(__file__).resolve().parents[2] / "prototypes" / "package.json"))
info = {
    "commit": sha,
    "short": sha[:7],
    "built": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "version": pkg["version"],
}
if pkg.get("releaseName"):
    info["name"] = pkg["releaseName"]
open(out, "w").write(json.dumps(info) + "\n")

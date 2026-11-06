"""The `roster` check stage on the Library (chunk 6): rules over the whole roster, not one species file. The registry's roster rules (framework/language.mjs, chunk 1) and roster.read48 (the kinds' 48 px silhouettes on the stands) are worked out in node (framework/library-roster.mjs), which is where the registry lives; this reads its rows.
A row is {id, level (red or amber), pass, messages, ...}; the studio shows red ones as fails and amber ones as warnings. The fail lines are OWED to the copywriter."""
import json
import os
import subprocess

TOOL = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "tools", "roster-rows.mjs")


def rows(stands_dir=None):
    """The roster stage's rows. Raises RuntimeError with node's words when the rows cannot be worked out."""
    cmd = ["node", TOOL] + ([stands_dir] if stands_dir else [])
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        raise RuntimeError(p.stderr.strip() or "roster rows failed")
    return json.loads(p.stdout)


def state(r):
    """pass, warn or fail for the studio: a failing amber rule is a warning."""
    return "pass" if r["pass"] else ("warn" if r["level"] == "amber" else "fail")

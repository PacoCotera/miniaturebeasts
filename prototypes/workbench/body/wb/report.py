"""Sheets for the workbench: small HTML pages with real text (sheetlib's house CSS: system sans, 14 px and up), screenshotted with the installed Playwright. The HTML sits beside the PNG."""
import html
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)
import sheetlib as SL


def write(outdir, name, title, body, width=1400):
    os.makedirs(outdir, exist_ok=True)
    h = os.path.join(outdir, name + ".html")
    p = os.path.join(outdir, name + ".png")
    open(h, "w").write(SL.page(title, body))
    SL.shoot(h, p, width)
    return h, p


def timing_sheet(summary, outdir, name="timing", extra=None):
    """The chunk 1 done-picture: S20 type, ms per stage, vertex count, cage hash."""
    T = summary["timings_ms"]
    calls = summary.get("calls", {})
    rows = []
    for k, v in T.items():
        if k.startswith("cage."):
            lab = k[5:]
            rows.append((f"&nbsp;&nbsp;{html.escape(lab)}", f"{v:,.0f}", f"{calls.get(lab, 1)}"))
        else:
            rows.append((f"<b>{html.escape(k)}</b>", f"<b>{v:,.0f}</b>", ""))
    ex = extra or {}
    facts = [("species", summary["species"]), ("genome", ex.get("genome", "type")), ("stage", summary["stage"]), ("cage vertices (mirrored)", f"{summary['vertices']:,}"), ("cage faces", f"{summary['faces']:,}"),
             ("cage hash", f"<span class='mono'>{summary['cage_hash'][:16]}…</span>"), ("cage key", f"<span class='mono'>{summary['key'][:16]}…</span>"), ("framework id", f"<span class='mono'>{summary['framework']}</span>")]
    for k, v in ex.get("facts", []):
        facts.append((k, v))
    body = f"<h1>Chunk 1: facade and timings, {html.escape(summary['species'])} type</h1><p>One build through <span class='mono'>wb.build(spec, genome, stage)</span>. Times are wall-clock milliseconds on this machine; the lines under <i>cage</i> are the S20 stage functions inside it (some run more than once: the arm-fit loop builds the cage again).</p>"
    body += "<div class='row'><div>" + SL.table(facts, ["fact", "value"]) + "</div><div>" + SL.table(rows, ["stage", "ms", "calls"]) + "</div></div>"
    if ex.get("note"):
        body += "<p>" + ex["note"] + "</p>"
    return write(outdir, name, "Chunk 1 timings", body, 1100)

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


def proxy_sheet(tiles, outdir, name="proxy", summary=None, cold_ms=None, note=""):
    """The chunk 2 done-picture. tiles: {(mode, az, size): (png path inside outdir, ms)}. 304 px tiles in a grid of mode rows by azimuth columns; the 96 and 48 px renders of the same views beside each other under it."""
    import shutil
    modes = ("clay", "normal", "parts", "wire")
    azs = (0, 32, 90, 180)

    def cell(k, w):
        pth, ms = tiles[k]
        return f"<div class='cell'><img src='{os.path.basename(pth)}' width='{w}'><div class='cap'>{k[0]} az {k[1]} &middot; {k[2]} px &middot; <b>{ms:.0f} ms</b></div></div>"

    def grid(size, w, gap=6):
        h = f"<div class='grid' style='grid-template-columns:repeat(4,{w + 8}px)'>"
        for m in modes:
            for a in azs:
                h += cell((m, a, size), w)
        return h + "</div>"
    tot = {s: sum(tiles[(m, a, s)][1] for m in modes for a in azs) for s in (304, 96, 48)}
    body = "<h1>Chunk 2: warm proxy renderer, S20 type</h1>"
    body += f"<p>Blender Workbench engine in one persistent bpy process, the house cameras (az 0, 32, 90, 180; elevation 10), level-1 proxy mesh ({summary['vertices_l1']:,} vertices). Milliseconds are per view, written as a PNG, after the engine's first render" + (f" (that first render took {cold_ms:.0f} ms)" if cold_ms else "") + f". All 16 views at 304: {tot[304]:.0f} ms; at 96: {tot[96]:.0f} ms; at 48: {tot[48]:.0f} ms.</p>"
    body += "<h2>304 &times; 312</h2>" + grid(304, 304)
    body += "<h2>96 &times; 88 and 48 &times; 48 (shown at 1x)</h2><div class='row'>" + grid(96, 96) + grid(48, 48) + "</div>"
    if note:
        body += "<p>" + note + "</p>"
    return write(outdir, name, "Chunk 2 proxy renderer", body, 1380)

"""Sheets for the workbench: small HTML pages with real text (sheetlib's house CSS: system sans, 14 px and up), screenshotted with the installed Playwright. The HTML sits beside the PNG."""
import html
import json
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


def contact_sheet(info, outdir, name):
    """The `wb render --sheet` page: the four clay views at the house angles, the normal, parts and wire views at az 32, the numbers, the recent edits.
    info: dict(species, genome, spec_hash, cage, views {(mode, az, size): (path, ms, cached)}, edits [undo entries], job_ms)."""
    v = info["views"]
    c = info["cage"]

    def cell(k):
        pth, ms, cached = v[k]
        tag = "cache hit" if cached else f"{ms:.0f} ms"
        return f"<div class='cell'><img src='file://{pth}' width='304'><div class='cap'>{k[0]} az {k[1]} &middot; {tag}</div></div>"
    body = f"<h1>{html.escape(info['species'])} &middot; {html.escape(info['genome'])} &middot; proxy views</h1>"
    body += "<div class='grid' style='grid-template-columns:repeat(4,312px)'>" + "".join(cell(("clay", a, 304)) for a in (0, 32, 90, 180)) + "</div><div style='height:6px'></div>"
    rows = [("species file hash", f"<span class='mono'>{info['spec_hash'][:16]}…</span>"), ("cage hash", f"<span class='mono'>{c['cage_hash'][:16]}…</span>"), ("cage vertices", f"{c['vertices']:,}"),
            ("level-1 proxy vertices", f"{c['vertices_l1']:,}"), ("cage", "from the cache (an earlier job built it)" if c["cached"] else f"built in {c['timings_ms']['total'] / 1000:.1f} s"),
            ("views", f"{sum(1 for x in v.values() if x[2])} of {len(v)} from the cache")]
    ed = info.get("edits") or []
    erows = [(html.escape(e["actor"]) + (" (agent)" if e.get("agent") else ""), html.escape(e["via"]), "<span class='mono'>" + html.escape(e["path"]) + "</span>", html.escape(json.dumps(e["old"])) + " &rarr; " + html.escape(json.dumps(e["new"]))) for e in ed[-5:]]
    body += "<div class='grid' style='grid-template-columns:repeat(3,312px) 640px'>" + "".join(cell(k) for k in (("normal", 32, 304), ("parts", 32, 304), ("wire", 32, 304)))
    body += "<div><h2>Numbers</h2>" + SL.table(rows) + "</div></div>"
    if erows:
        body += "<h2>Last edits (the undo log)</h2>" + SL.table(erows, ["who", "how", "field", "change"])
    return write(outdir, name, "contact sheet", body, 1300)


def variety_sheet(sh, tiles, outdir, name="variety", previous=None, title=None, note=""):
    """The Variety sheet page: the counts panel (each look, how many of the sheet show it, wild and cross), then the individuals as tiles (a failing one with a red edge and its words).
    sh: the server's variety data; tiles: {n: png file name inside outdir}; previous: None or dict(caption, tiles {n: file name}, hint) for the run before, shown under each tile."""
    def pct(v):
        return f"{v:.0f}%" if v >= 10 or float(v).is_integer() else f"{v:.1f}%"
    fails = {i["n"]: i["fails"] for i in sh["individuals"]}
    body = f"<h1>{html.escape(title or 'Variety')} &middot; seed {sh['seed']} &middot; {sh['n']} individuals</h1>"
    if note:
        body += f"<p>{note}</p>"
    rows = []
    for l in sh["looks"]:
        age = f" &middot; from {html.escape(l['age'])}" if l.get("age") else ""
        rows.append((html.escape(l["label"]) + age, f"<b>{l['count']}</b> of {sh['n']}", "no. " + ", ".join(map(str, l["who"])) if l["who"] else "&ndash;", pct(l["wild"]), f"{round(l['cross'] * l['cross_of'] / 100)} of {l['cross_of']}"))
    counts = SL.table(rows, ["look", "on this sheet", "which", f"wild ({sh['wild_n']:,} pods)", "cross (seeds)"])
    rules = "".join(f"<p><b>{html.escape(r['label'])}</b>: " + (("broken by no. " + ", ".join(map(str, r["broken"]))) if r["broken"] else "holds for all " + str(sh["n"])) + f" &middot; breaking it reads &ldquo;{html.escape(r['fail'])}&rdquo;</p>" for r in sh["rules"])
    def cell(n, f, w=304):
        bad = fails[n]
        edge = "border:3px solid #c0392b;" if bad else ""
        cap = f"<b>No. {n}</b> &middot; {html.escape(sh['individuals'][n - 1]['genome'])}" + ("<br><span class='fail'>" + "; ".join(html.escape(x["words"]) for x in bad) + "</span>" if bad else "")
        pair = f"<img src='{f}' width='{w}'>"
        if previous and n in previous["tiles"]:
            pair = "<div style='display:flex;gap:6px'>" + pair + f"<img src='{previous['tiles'][n]}' width='{w}'></div>"
            cap = f"<div style='display:flex;justify-content:space-around'><span>{html.escape(previous.get('left', 'now'))}</span><span>{html.escape(previous['caption'])}</span></div>" + cap
        return f"<div class='cell' style='{edge}'>{pair}<div class='cap'>{cap}</div></div>"
    cols = 2 if previous else 4
    wcell = (2 * 304 + 22) if previous else 320
    grid = f"<div class='grid' style='grid-template-columns:repeat({cols},{wcell}px)'>" + "".join(cell(i["n"], tiles[i["n"]]) for i in sh["individuals"]) + "</div>"
    body += "<div class='row'><div style='width:600px;flex:none'><h2>Looks on this sheet</h2>" + counts + "<h2>Species rules</h2>" + rules + "</div><div>" + grid + "</div></div>"
    if previous and previous.get("hint"):
        body += "<p>" + previous["hint"] + "</p>"
    return write(outdir, name, "Variety sheet", body, 2000 if previous else 1900)

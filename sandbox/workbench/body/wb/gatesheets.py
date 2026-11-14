"""The six sheets of a gate round, one template each, the same for every species and plan: Turnaround, Before and after, Joins, The twelve, Motion, Close-up. A language file (mb-species/2, not a fixture) gets a seventh, the Language sheet:
the kind at 96 beside the wall, the 304 turnaround beside its stand, the 48 silhouette and the land swatch. The wall and the stands are the art desk's pictures, read from `<home>/language/` when they are there (`wall-96.png`, `stand-<id>-*-304x*.png`, `-48x48.png`); a kind with none says so.
`make(srv, sp, n, outdir)` gets the pictures through the server's own jobs (the clay renders, the plush, the Variety tiles and the clips come from the cache when they are there), then writes one HTML page and one PNG per sheet into
outdir (`<id>.html`, `<id>.png` and the pictures beside them, `index.json`). A sheet that a species cannot have (no variety sampler, no clip) says so on its page. Pages are real text, 14 px and up (sheetlib).
Nothing here names a species or its shape."""
import html
import json
import os
import shutil

import sheetlib as SL
from wb import gate as GT

AZ = (0, 32, 90, 180)
WAIT = 600


def _wait(job, what):
    job.event.wait(WAIT)
    if job.state != "done":
        raise RuntimeError(f"{what}: the job ended {job.state}" + (f" ({job.error})" if job.error else ""))
    return job.result


def _views(srv, sp, spec, spec_hash, modes, azs, sizes, actor):
    """{(mode, az, size): cas key} of clay-family renders of `spec`."""
    job = srv.submit(sp.id, "render", dict(genome="type", modes=list(modes), az=list(azs), sizes=list(sizes)), actor, priority=3, spec=spec, spec_hash=spec_hash)
    res = _wait(job, "render")
    return {(v["mode"], v["az"], v["size"]): v["key"] for v in res["views"]}


def _put(srv, key, outdir, name):
    src = srv.cas.path(key, "png")
    shutil.copyfile(src, os.path.join(outdir, name))
    return name


def _cell(img, cap, w):
    return f"<div class='cell'><img src='{html.escape(img)}' width='{w}' alt='{html.escape(cap)}'><div class='cap'>{html.escape(cap)}</div></div>"


def _page(outdir, sid, title, head, body, width=1400):
    h = os.path.join(outdir, sid + ".html")
    p = os.path.join(outdir, sid + ".png")
    with open(h, "w") as fh:
        fh.write(SL.page(title, f"<h1>{html.escape(title)}</h1><p>{html.escape(head)}</p>" + body))
    SL.shoot(h, p, width, 100)                                      # a short window: the picture is as tall as the page, with no blank space under it
    return p


def _silhouette(src, dst):
    """The picture's silhouette as black on clear, from its alpha (or, for a picture with none, from what differs from its corner)."""
    import numpy as np
    from wb import pngio
    a = pngio.read(src)
    m = a[..., 3] > 8
    if m.all():
        m = np.abs(a[..., :3].astype(int) - a[0, 0, :3].astype(int)).sum(-1) > 24
    out = np.zeros(a.shape, np.uint8)
    out[..., 3] = np.where(m, 255, 0)
    pngio.write(dst, out)


def _swatch(land):
    cells = "".join(f"<div class='sw'><i style='background:{html.escape(c['hex'])}'></i><span>{html.escape(role)} · {html.escape(c['name'])} · {html.escape(c['hex'])}</span></div>" for role, c in (("body", land["body"]), ("marking", land["marking"]), ("accent", land["accent"])))
    return f"<div class='swatch'>{cells}</div>"


def _find(folder, pattern):
    import glob
    hit = sorted(glob.glob(os.path.join(folder, pattern)))
    return hit[0] if hit else None


def language_sheet(srv, spec, sid, pic, clay32, outdir):
    """The body of the Language sheet. `pic` is the plush hero's cas key (or None), `clay32` the clay render's."""
    import species_v1 as V1
    ref = os.path.join(srv.home, "language")
    kind = _put(srv, pic or clay32, outdir, "language-kind.png")
    _silhouette(os.path.join(outdir, kind), os.path.join(outdir, "language-silhouette.png"))
    land = next((l for l in V1.registry()["lands"] if l["id"] == spec.get("land")), None)

    def ref_cell(pattern, cap, w, name):
        f = _find(ref, pattern)
        if f is None:
            return f"<div class='cell none' style='width:{max(w, 230)}px'><div class='cap'>{html.escape(cap)}: none yet</div></div>"
        shutil.copyfile(f, os.path.join(outdir, name))
        return _cell(name, cap, w)
    wall = ref_cell("wall-96.png", "the wall at 96", 480, "language-wall.png")
    r96 = f"<div class='cell'><img src='{kind}' width='96' alt='the kind at 96'><div class='cap'>{html.escape(sid)} at 96</div></div>"
    r304 = f"<div class='cell'><img src='{kind}' width='304' alt='the kind at 304'><div class='cap'>{html.escape(sid)} at 304</div></div>"
    stand = ref_cell(f"stand-{sid}-*-304x*.png", f"the stand of {sid} at 304", 304, "language-stand.png")
    s48 = f"<div class='cell'><img src='language-silhouette.png' width='48' alt='silhouette at 48'><div class='cap'>silhouette at 48</div></div>"
    st48 = ref_cell(f"stand-{sid}-*-48x48.png", f"the stand of {sid} at 48", 48, "language-stand-48.png")
    land_html = _swatch(land) if land else "<p>No land is set in this file yet, so there is no swatch.</p>"
    css = "<style>.swatch{display:flex;gap:14px}.sw{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #bbb;padding:6px 10px}.sw i{display:block;width:44px;height:44px;border:1px solid #888}.cell.none{padding:12px}</style>"
    return (css + f"<h2>At 96, beside the wall</h2><div class='row'>{r96}{wall}</div><h2>At 304, beside its stand</h2><div class='row'>{r304}{stand}</div>"
            f"<h2>The silhouette at 48</h2><div class='row'>{s48}{st48}</div><h2>The land</h2>{land_html}")


def _row(cells, cols=4, w=304):
    return f"<div class='grid' style='grid-template-columns:repeat({cols},{w + 10}px)'>" + "".join(cells) + "</div>"


def make(srv, sp, n, outdir, actor=None, log=print):
    import copy
    from wb import hashing as H
    os.makedirs(outdir, exist_ok=True)
    spec = copy.deepcopy(sp.spec)
    sh = H.hash_of(spec)
    name = spec.get("name") or sp.id
    made = {}
    labels = GT.LABELS

    def page(sid, head, body, width=1400):
        made[sid] = os.path.basename(_page(outdir, sid, f"{name} · {labels[sid]}", head, body, width))
        log(f"sheet {sid}")

    clay = _views(srv, sp, spec, sh, ["clay"], AZ, [304, 608], actor)
    # Turnaround: the four clay angles and the plush hero
    cells = [_cell(_put(srv, clay[("clay", a, 304)], outdir, f"clay-{a}.png"), f"clay, az {a}", 304) for a in AZ]
    def hero():
        try:
            return srv.picture(spec, "type")
        except Exception as e:                                # a plan with no plush yet: the sheet is drawn in clay
            log(f"no plush: {e}")
            return dict(ready=False)
    pic = hero()
    if "key" in pic and not pic["ready"]:                     # the plush hero is asked for at the sheet's own priority and waited for
        try:
            job = srv.submit_plush(sp, "type", actor, 3, spec=spec)
            job.event.wait(180)
        except Exception as e:
            log(f"no plush: {e}")
        pic = hero()
    plush = ""
    if pic["ready"]:
        plush = _cell(_put(srv, pic["key"], outdir, "plush-32.png"), "plush, az 32", 304)
    page("turnaround", "The four house angles in clay" + (" and the plush hero" if plush else "") + ".", _row(cells, 2) + (f"<h2>Plush</h2>{_row([plush], 1)}" if plush else ""), 700)   # two to a row: the page is 700 wide, so it shows whole on the Gate stage of a desktop and a tablet

    # Before and after: this file beside the file of the round before (or the file the goldens were made from)
    before = GT.read_snapshot(sp.path, n - 1) if n > 1 else None
    src = "round %d" % (n - 1) if before else None
    if before is None:
        gp = os.path.join(os.path.dirname(os.path.abspath(sp.path)), "goldens", sp.id, "source.json")
        if os.path.exists(gp):
            with open(gp) as fh:
                before, src = json.load(fh), "the goldens"
    if before is not None:
        bh = H.hash_of(before)
        bclay = _views(srv, sp, before, bh, ["clay"], AZ, [304], actor)
        top = [_cell(_put(srv, bclay[("clay", a, 304)], outdir, f"before-{a}.png"), f"before, az {a}", 304) for a in AZ]
        bot = [_cell(_put(srv, clay[("clay", a, 304)], outdir, f"after-{a}.png"), f"after, az {a}", 304) for a in AZ]
        moved = bh != sh
        page("before-after", f"Before is the file of {src} ({bh[:8]}); after is this round's file ({sh[:8]})." + ("" if moved else " They are the same file."), _row(top) + _row(bot))
    else:
        page("before-after", "There is no earlier file to set beside this one: this is the first round and no goldens exist yet.", "")

    # Joins: the parts, wire and normal views, where each socket meets its range
    j = _views(srv, sp, spec, sh, ["parts", "wire", "normal"], (32, 90), [304], actor)
    cells = [_cell(_put(srv, j[(m, a, 304)], outdir, f"{m}-{a}.png"), f"{m}, az {a}", 304) for m in ("parts", "wire", "normal") for a in (32, 90)]
    page("joins", "Parts in colours, the wire and the normals at az 32 and 90, where the parts meet.", _row(cells, 3))

    # The twelve: the Variety sheet's tiles
    try:
        vj = srv.submit_variety(sp, dict(n=12), actor)
        run = _wait(vj, "variety")
        cells = [_cell(_put(srv, t["keys"]["304"] if "304" in t["keys"] else list(t["keys"].values())[0], outdir, f"twelve-{t['n']}.png"), f"No. {t['n']}" + (" · " + "; ".join(t["fails"]) if t["fails"] else ""), 304) for t in run["tiles"]]
        page("twelve", f"Twelve mibis drawn from the file's own rules (seed {run['seed']}).", _row(cells, 4), 1400)
    except Exception as e:
        page("twelve", "This species has no twelve to draw yet: " + str(getattr(e, "message", e)), "")

    # Motion: each clip's clay strip
    try:
        from wb import clips as CL
        plan = CL.table(CL.plan_of(spec))
        body = ""
        for clip in plan:
            c = srv.clip_of(sp, spec, __import__("wb.play", fromlist=["x"]).state_genome(spec), clip, ask=True, priority=3)
            job = srv.queue.jobs.get(c["clay"]["job"]) if c["clay"].get("job") else None
            if job:
                _wait(job, "clip")
            if srv.cas.has(c["clay"]["key"], "png", touch=False):
                body += f"<h2>{html.escape(clip)} · {c['frames']} frames</h2><div class='cell' style='display:inline-block'><img src='{_put(srv, c['clay']['key'], outdir, 'clip-' + clip + '.png')}' alt='{html.escape(clip)}'></div>"
        page("motion", "Each clip as one strip of clay frames.", body, 2000)
    except Exception as e:
        page("motion", "This species has no clips to show yet: " + str(getattr(e, "message", e)), "")

    # Close-up: the large clay at the two angles that hide the most, and the parts view
    cl = _views(srv, sp, spec, sh, ["clay", "parts"], (32, 180), [608], actor)
    cells = [_cell(_put(srv, cl[(m, a, 608)], outdir, f"close-{m}-{a}.png"), f"{m}, az {a}", 608) for m, a in (("clay", 32), ("clay", 180), ("parts", 32))]
    page("close-up", "The clay at 608 px from the side and from behind, and the parts view.", _row(cells, 3, 608), 2000)
    if GT.is_language(spec):
        hero = pic["key"] if plush else None
        page("language", "The kind at 96 beside the wall, at 304 beside its stand, the silhouette at 48 and the land's colours.", language_sheet(srv, spec, sp.id, hero, clay[("clay", 32, 304)], outdir), 1100)
    with open(os.path.join(outdir, "index.json"), "w") as fh:
        json.dump(dict(round=n, file_hash=sh, sheets=made), fh)
    return made

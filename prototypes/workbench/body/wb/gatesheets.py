"""The six sheets of a gate round, one template each, the same for every species and plan: Turnaround, Before and after, Joins, The twelve, Motion, Close-up.
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
    labels = dict(GT.SHEETS)

    def page(sid, head, body, width=1400):
        made[sid] = os.path.basename(_page(outdir, sid, f"{name} · {labels[sid]}", head, body, width))
        log(f"sheet {sid}")

    clay = _views(srv, sp, spec, sh, ["clay"], AZ, [304, 608], actor)
    # Turnaround: the four clay angles and the plush hero
    cells = [_cell(_put(srv, clay[("clay", a, 304)], outdir, f"clay-{a}.png"), f"clay, az {a}", 304) for a in AZ]
    pic = srv.picture(spec, "type")
    if not pic["ready"]:                                      # the plush hero is asked for at the sheet's own priority and waited for
        try:
            job = srv.submit_plush(sp, "type", actor, 3, spec=spec)
            job.event.wait(180)
        except Exception as e:
            log(f"no plush: {e}")
        pic = srv.picture(spec, "type")
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
    with open(os.path.join(outdir, "index.json"), "w") as fh:
        json.dump(dict(round=n, file_hash=sh, sheets=made), fh)
    return made

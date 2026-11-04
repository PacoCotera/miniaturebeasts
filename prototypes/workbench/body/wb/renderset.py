"""Chunk 11: the render set, drawn. Under the bpy venv: python -m wb.renderset SPECIES.json OUTDIR [--only output,output] [--styles clay,silhouette] [--genome G]
Reads the set from the file (wb/renders.py), draws every `ready` variant at its game size and writes PNGs, the layered stand's files and one manifest.json. Styles:
  plush       the house velvet look, Cycles (plush.py: the look-dev settings), on the stand pose; small sprites rendered at 3x or 4x and box-filtered down
  clay        the workbench matcap (proxy.py), alpha around the figure, the clay's face on
  silhouette  one flat fill, alpha only, on the same stand pose as the plush
`from: master` sprites are not rendered: they are made from the stand's 304x312 art by wb/stand.py (the game's build scale; the face never scales).
The layered stand: the base (every expression of the file off), one layer per look the file's expressions declare (the pixels the look adds or takes off), and a 304x48 contact shadow (the floor shadow alone)."""
import argparse
import json
import os
import sys
import time

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import numpy as np

from wb import renders as RS, stand as ST, pngio, facade as F

EL = 10.0
# the cameras: (canvas w, h) -> (px per H, centre). The house cameras of proxy.py for 304x312, 96 and 48; the others keep the house framing (the figure's feet the same share of the canvas up from the bottom)
CAMERAS = {
    (304, 312): (95.0, (-0.35, 0.0, 1.3)),
    (96, 88): (30.0, (-0.35, 0.0, 1.3)),
    (96, 96): (30.0, (-0.35, 0.0, 1.3 + 4 / (30.0 * 0.985))),
    (48, 48): (15.0, (-0.35, 0.0, 1.25)),
    (128, 160): (38.0, (-0.35, 0.0, 1.3 + 36 / (38.0 * 0.985))),
}
SIL = (0.10, 0.10, 0.12)


def camera(size):
    if tuple(size) not in CAMERAS:
        raise KeyError(f"no camera for {size[0]}x{size[1]}")
    return CAMERAS[tuple(size)]


def alpha_png(path):
    return pngio.read(path)


# ---------------------------------------------------------------- the species at its stand pose (Blender-free until the mesh is drawn)
class Subject:
    """One genome of the species: its cage body, the stand-posed mesh and the texture atlas (made on first use)."""
    def __init__(self, spec, genome, scratch):
        self.spec, self.genome, self.scratch = spec, genome, scratch
        self.r = F.build(spec, genome, "base")
        self.b, self.c = self.r.body, self.r.c
        self._M = self._paths = self._rest = None

    def posed(self):
        if self._M is None:
            import s20rig, s20tex as TX, s20p2 as P2
            R = s20rig.Rig(self.b.ctx)
            self._M = P2.posed(TX.render_mesh(self.b), self.b, R, R.stand_pose())
        return self._M

    def tex(self):
        if self._paths is None:
            import s20pipe as PP, s20p2 as P2
            tex = PP.make_tex(self.b, self.c["coat"], frames=("open",))
            self._paths = P2.write_tex(tex, os.path.join(self.scratch, f"tex-{self.r.genome_hash[:10]}"))
        return self._paths

    def welded(self):
        """The posed level-2 mesh as the proxy renderer takes it: welded vertices, quads, the part of each vertex."""
        M = self.posed()
        Vw = np.zeros_like(M["Vw"])
        Vw[M["vid"]] = M["V"]
        return dict(V=Vw, F=np.asarray(M["Fw"], int), part=M["part"])


# ---------------------------------------------------------------- the Workbench styles (clay, silhouette)
class Proxy:
    def __init__(self, scratch):
        from wb import proxy as P
        self.P = P
        self.pr = P.ProxyRenderer()
        self.pr.warm(os.path.join(scratch, "warm.png"))
        import bpy
        self.bpy = bpy
        self.sil_mat = bpy.data.materials.new("sil")
        self.sil_mat.diffuse_color = (*SIL, 1.0)
        for i, (w, h) in enumerate(k for k in CAMERAS if k not in ((304, 312), (96, 88), (48, 48))):
            pass
        self.ids = {}
        for (w, h), (ppH, c) in CAMERAS.items():
            self.ids[(w, h)] = 100000 + w * 1000 + h                      # a private size id per canvas
            P.SIZES[self.ids[(w, h)]] = (w, h, ppH)

    def _clay_mesh(self, subject):
        from wb import clayface as CF
        m = F.proxy_mesh(subject.b, 1)
        cx = subject.b.ctx
        m["face_V"], m["face_F"] = CF.face_mesh(cx["T"], cx["spec"], dict(subject.r.c.get("coat") or {}), m)
        return m

    def _render(self, mode, az, size, path, centre):
        sc = self.pr.sc
        saved = (sc.render.film_transparent, sc.render.image_settings.color_mode, self.P.CENTRE)
        sc.render.film_transparent, sc.render.image_settings.color_mode = True, "RGBA"
        self.P.CENTRE = np.array(centre, float)
        try:
            self.pr.render(mode, az, self.ids[tuple(size)], path)
        finally:
            sc.render.film_transparent, sc.render.image_settings.color_mode, self.P.CENTRE = saved
        return pngio.read(path)

    def clay(self, subject, az, size, path):
        key = ("clay", subject.r.key)
        if self.pr.mesh_key != key:
            self.pr.set_mesh(self._clay_mesh(subject), key)
        return self._render("clay", az, size, path, camera(size)[1])

    def silhouette(self, subject, az, size, path):
        key = ("sil", subject.r.key)
        if self.pr.mesh_key != key:
            m = subject.welded()
            self.pr.set_mesh(m, key)
            self.pr.body.data.materials.clear()
            self.pr.body.data.materials.append(self.sil_mat)
        pr, sh = self.pr, self.pr.sc.display.shading
        sc = pr.sc
        saved = (sc.render.film_transparent, sc.render.image_settings.color_mode, self.P.CENTRE, sh.light, sh.color_type)
        sc.render.film_transparent, sc.render.image_settings.color_mode = True, "RGBA"
        self.P.CENTRE = np.array(camera(size)[1], float)
        pr._camera(float(az), self.ids[tuple(size)])
        pr.wire.hide_render = True
        sh.light, sh.color_type = "FLAT", "MATERIAL"
        sc.render.filepath = path
        try:
            self.bpy.ops.render.render(write_still=True)
            self.P.strip_png_text(path)
        finally:
            sc.render.film_transparent, sc.render.image_settings.color_mode, self.P.CENTRE, sh.light, sh.color_type = saved
        a = pngio.read(path)
        a[..., :3] = [round(c * 255) for c in SIL]                      # one flat fill: only the alpha is the picture
        return a


# ---------------------------------------------------------------- plush (Cycles)
def plush(subject, az, size, path, floor="bounce", body_visible=True, samples=None):
    """floor: \"bounce\" (the default: a floor out of the camera's sight that lights the body from below, so every picture of the set has the same exposure and no shadow), True (the floor's shadow catcher) or False (no floor)."""
    import s20render as RN, plush as PL
    for w, ss in ((96, 3), (128, 3)):
        PL.SS.setdefault(w, ss)
    ppH, centre = camera(size)
    a, cam = RN.render_tex(subject.posed(), subject.tex(), subject.c["coat"], path, size[0], size[1], ppH, az=float(az), el=EL, centre=centre, samples=samples, floor=floor, body_visible=body_visible, light=PL.GAME_LIGHT)
    px = np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)
    pngio.write(path, px)
    return px


# ---------------------------------------------------------------- the layered stand
def off_individual(spec, expr_list, keep=None):
    """The type with every look of `expr_list` off, except `keep` (an expression id) shown. The individual dict the facade's builder takes."""
    import expressions as EX
    g = spec["genome"]
    by = EX.by_locus(g)
    typ = F.resolve_genome("type", F.internal(spec))
    ind = typ
    for e in expr_list:
        ent = by[e["locus"]]
        pool = EX.pool_of(ent)
        if ent["op"] == "blend":
            raise ValueError(f"expression {e['id']}: a blend's look has no layer")
        want = e["look"] if e["id"] == keep else next((p for p in reversed(pool) if p != e["look"]), None)
        if ent["op"] == "switch":
            want = "on" if e["id"] == keep else "off"
        alt = F.resolve_genome(f"allele:{e['locus']}={want}", F.internal(spec))
        for k in ("t", "pairs", "switches"):
            for kk in alt[k]:
                if alt[k][kk] != typ[k][kk]:
                    ind = _set(ind, k, kk, alt[k][kk])
    return ind


def _set(ind, k, kk, v):
    import copy
    ind = copy.deepcopy(ind)
    ind[k][kk] = v
    return ind


def stand(spec, subject_type, outdir, scratch, species, age, pose, log):
    """The layered stand of one age and pose: files in outdir and the index entry. Returns (entry, base, layers, shadow, feet)."""
    exprs = [e for e in (spec.get("expressions") or [])]
    name = f"{species}-{age}-{pose}"
    base_ind = off_individual(spec, exprs)
    sb = Subject(spec, base_ind, scratch)
    t = time.time()
    base_path = os.path.join(outdir, f"{name}-304x312-base.png")
    base = plush(sb, 32, (304, 312), base_path)
    log(f"stand base {time.time() - t:.0f} s")
    fig = ST.ink_box(base)
    layers = []
    for e in exprs:
        so = Subject(spec, off_individual(spec, exprs, keep=e["id"]), scratch)
        on = plush(so, 32, (304, 312), os.path.join(scratch, f"on-{e['id']}.png"))
        ov, er = ST.layer_from_pair(base, on)
        for op, px in (("erase", er), ("over", ov)):                  # what the look takes off first, then what it lays on
            if px is None:
                continue
            fn = f"{name}-304x312-{e['id']}" + ("-erase" if op == "erase" else "") + ".png"
            pngio.write(os.path.join(outdir, fn), px)
            layers.append(dict(op=op, trait=e["locus"], looks=[e["look"]], order=10 + len(layers), file=fn, pixels=px))
        log(f"stand layer {e['id']}")
    feet = fig[1] + fig[3] - 1
    x0, x1 = ST.feet_span(base, feet)
    shadow = ST.contact_shadow((304, ST.SHADOW_H), (x0 + x1 + 1) / 2.0, ST.FEET_ROW, x1 - x0 + 1)          # the shadow layer: one soft ellipse under both feet, drawn (the floor's own cast shadow is long and hard to bound)
    shadow_fn = f"{species}-{age}-304x48-shadow.png"
    pngio.write(os.path.join(outdir, shadow_fn), shadow)
    entry = dict(traits=sorted({l["trait"] for l in layers}), pose=pose, figure=fig,
                 sizes={"304x312": dict(base=os.path.basename(base_path), bases={}, layers=[dict(op="under", order=0, file=shadow_fn, views=["home", "vivarium", "idle"], size=[304, ST.SHADOW_H], feetRow=ST.FEET_ROW, standFeet=feet)] +
                                                                                      [{k: v for k, v in l.items() if k != "pixels"} for l in layers])})
    return entry, base, layers, shadow, feet


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("species")
    ap.add_argument("out")
    ap.add_argument("--only", default="")
    ap.add_argument("--styles", default="", help="only these styles (plush, clay, silhouette)")
    ap.add_argument("--scratch", default="")
    a = ap.parse_args()
    spec = json.load(open(a.species))
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)
    scratch = os.path.abspath(a.scratch or os.path.join(out, "_scratch"))
    os.makedirs(scratch, exist_ok=True)
    only = set(x for x in a.only.split(",") if x)
    styles = set(x for x in a.styles.split(",") if x)
    sid = spec["id"]
    T0 = time.time()
    log = lambda m: print(f"[{time.time() - T0:6.1f}s] {m}", flush=True)
    rows = [r for r in RS.expand(spec) if r["state"] == "ready" and (not only or r["output"] in only) and (not styles or r["style"] in styles)]
    owed = [r for r in RS.expand(spec) if r["state"] == "owed"]
    res = []
    typ = Subject(spec, "type", scratch)
    # Workbench styles first (Cycles resets the scene)
    px = Proxy(scratch)
    for r in rows:
        if r["style"] not in ("clay", "silhouette"):
            continue
        fn = os.path.join(out, f"{sid}-{r['output']}-{r['variant']}.png")
        t = time.time()
        img = (px.clay if r["style"] == "clay" else px.silhouette)(typ, r["az"], r["size"], fn)
        pngio.write(fn, img)
        res.append(dict(r, file=os.path.basename(fn), ms=round((time.time() - t) * 1000)))
        log(f"{r['output']} {r['variant']}")
    # plush
    masters = {}
    index = None
    for r in rows:
        if r["style"] != "plush" or r["from"] == "master":
            continue
        t = time.time()
        if r["kind"] == "layers":
            if r["pose"] == "anchor":
                continue                                   # the stage's entry pose is the calm stand (below)
            entry, base, layers, shadow, feet = stand(spec, typ, out, scratch, sid, r["age"], r["pose"], log)
            masters[(r["age"], r["pose"])] = (entry, base, layers, shadow, feet)
            index = {sid: {r["age"]: entry}}
            res.append(dict(r, file=entry["sizes"]["304x312"]["base"], ms=round((time.time() - t) * 1000)))
            continue
        fn = os.path.join(out, f"{sid}-{r['output']}-{r['variant']}.png")
        plush(typ, r["az"], r["size"], fn)
        res.append(dict(r, file=os.path.basename(fn), ms=round((time.time() - t) * 1000)))
        log(f"{r['output']} {r['variant']}")
    # the anchor is the calm stand
    for r in rows:
        if r["kind"] == "layers" and r["pose"] == "anchor" and (r["age"], "calm") in masters:
            res.append(dict(r, file=masters[(r["age"], "calm")][0]["sizes"]["304x312"]["base"], alias="calm", ms=0))
    # from the master
    for r in rows:
        if r["from"] != "master":
            continue
        if (r["age"], "calm") not in masters:                    # a picture made from the master needs the stand, even when the stand itself is not asked for
            masters[(r["age"], "calm")] = stand(spec, typ, out, scratch, sid, r["age"], "calm", log)
        entry, base, layers, shadow, feet = masters[(r["age"], "calm")]
        art = ST.compose(base, [(l["op"], l["pixels"]) for l in layers if l["op"] in ("over", "erase")])
        fig = ST.ink_box(art)
        view_shadow = r["output"] == "resident"
        pic, s = ST.from_master(art, fig, r["figure"], r["size"], shadow if view_shadow else None, feet)
        fn = os.path.join(out, f"{sid}-{r['output']}-{r['variant']}.png")
        pngio.write(fn, pic)
        res.append(dict(r, file=os.path.basename(fn), scale=round(s, 5), figure_box=fig, shadow=view_shadow, ms=0))
        log(f"{r['output']} {r['variant']} scale {s:.4f}")
    json.dump(dict(species=sid, built=time.strftime("%Y-%m-%d %H:%M"), set=RS.BASE, stand_index=index, rows=res, owed=[{k: o[k] for k in ("output", "variant", "style", "age", "pose", "why")} for o in owed], not_yet=RS.not_yet(spec), seconds=round(time.time() - T0)),
              open(os.path.join(out, "manifest.json"), "w"), indent=1, default=str)
    log("done")


if __name__ == "__main__":
    main()

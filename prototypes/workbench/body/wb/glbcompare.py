"""The exported glb against the picture it must reproduce: the glb's own mesh, skin, stand clip and coat images (read back with wb.glbread, no cage, no rig) are drawn by the plush render in the house view and compared
pixel by pixel with a reference PNG (pass 4's now-304). Under the bpy venv:
    python -m wb.glbcompare EXPORT_DIR REFERENCE.png OUT_DIR [--samples 64]
Writes OUT_DIR/glb-304.png and prints one JSON line: the number of differing pixels (any channel) and the largest difference.
A plan with no coat (the quadruped) has no plush to compare: `--clay SPECIES.json` draws the glb's mesh and the file's own with the clay render, in the stand and the clips' frames, and prints one line per view."""
import argparse
import json
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import numpy as np


def draw(glb_path, creature_path, out_png, samples=64, size=304):
    """The house view (az 32, el 10, the pass 4 framing) of the glb's stand pose, at `size`."""
    import s20render as RN
    import s20p3 as P3
    from wb import glbread
    g = glbread.read(glb_path)
    M = g.posed("stand")
    paths = g.write_textures(os.path.join(os.path.dirname(out_png), "glb-tex"))
    coat = json.load(open(creature_path))["coat"]
    w, h, ppH = P3.SL_.SIZES[size]
    a, cam = RN.render_tex(M, paths, coat, out_png, w, h, ppH, az=32.0, el=10.0, centre=(-0.35, 0, 1.3), samples=samples)
    RN.to_png(a, out_png)
    return out_png


VIEWS_CLAY = (("stand", 0, 32), ("stand", 0, 90), ("walk", 0, 32), ("walk", 3, 32), ("walk", 6, 32), ("walk", 9, 32), ("sit", 0, 32), ("curl", 0, 32))          # (clip, sample, az)


def clay(glb_path, species_path, out_dir, size=(304, 312), views=VIEWS_CLAY):
    """For a plan with no coat: the glb's own mesh (read back, no cage, no rig) drawn by the clay render, beside the clay render of the file's own mesh at the same camera. Returns [dict(view, glb, ref, differing, largest, pixels)]."""
    from wb import glbread, pngio, renderset as RSET, store as S
    os.makedirs(out_dir, exist_ok=True)
    spec = S.read_spec(species_path)
    scratch = os.path.join(out_dir, "_scratch")
    os.makedirs(scratch, exist_ok=True)
    real = RSET.make_subject(spec, "type", scratch)
    g = glbread.read(glb_path)

    class FromGlb:
        quad = True
        plan = real.plan

        class r:
            key = "glb-" + os.path.basename(glb_path)

        def posed(self, clip=None, i=0):
            m = g.posed("stand" if clip in (None, "calm", "anchor") else clip, 0 if clip in (None, "calm", "anchor") else i)
            return dict(V=m["V"], F=m["F"], part=m["part"], names=real.mesh["names"], frame=real.frame)

        def welded(self, M=None):
            return M or self.posed()
    px = RSET.Proxy(scratch)
    RSET.solve_frames(px, real, scratch, [size], azs=(32,))
    out = []
    for clip, i, az in views:
        name = f"{clip}-{i}-az{az}"
        c, k = (None, 0) if clip == "stand" else (clip, i)
        a = px.clay(real, az, size, os.path.join(out_dir, f"ref-{name}.png"), c, k)
        b = px.clay(FromGlb(), az, size, os.path.join(out_dir, f"glb-{name}.png"), c, k)
        d = np.abs(a.astype(int) - b.astype(int)).max(axis=2)
        out.append(dict(view=name, glb=os.path.join(out_dir, f"glb-{name}.png"), ref=os.path.join(out_dir, f"ref-{name}.png"), differing=int((d > 0).sum()), largest=int(d.max()), pixels=int(d.size)))
    return out


def diff(a_path, b_path):
    from wb import pngio
    a, b = pngio.read(a_path).astype(int), pngio.read(b_path).astype(int)
    if a.shape != b.shape:
        return dict(differing=int(a.shape[0] * a.shape[1]), largest=255, shape=[list(a.shape), list(b.shape)])
    d = np.abs(a - b).max(axis=2)
    return dict(differing=int((d > 0).sum()), largest=int(d.max()), pixels=int(d.size), shape=list(a.shape))


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("export")
    ap.add_argument("reference", help="the reference PNG (a plan with a coat), or the species file with --clay")
    ap.add_argument("out")
    ap.add_argument("--samples", type=int, default=64)
    ap.add_argument("--clay", action="store_true", help="a plan with no coat: `reference` is the species file; the glb's mesh and the file's own are both drawn by the clay render, in the stand and the clips' frames")
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    glbs = [f for f in os.listdir(a.export) if f.endswith(".glb")]
    if a.clay:
        for row in clay(os.path.join(a.export, glbs[0]), a.reference, os.path.abspath(a.out)):
            print(json.dumps(row))
        return
    p = draw(os.path.join(a.export, glbs[0]), os.path.join(a.export, "creature.json"), os.path.join(os.path.abspath(a.out), "glb-304.png"), a.samples)
    print(json.dumps(dict(file=p, **diff(p, a.reference))))


if __name__ == "__main__":
    main()

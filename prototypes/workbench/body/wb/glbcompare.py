"""The exported glb against the picture it must reproduce: the glb's own mesh, skin, stand clip and coat images (read back with wb.glbread, no cage, no rig) are drawn by the plush render in the house view and compared
pixel by pixel with a reference PNG (pass 4's now-304). Under the bpy venv:
    python -m wb.glbcompare EXPORT_DIR REFERENCE.png OUT_DIR [--samples 64]
Writes OUT_DIR/glb-304.png and prints one JSON line: the number of differing pixels (any channel) and the largest difference."""
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
    ap.add_argument("reference")
    ap.add_argument("out")
    ap.add_argument("--samples", type=int, default=64)
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    glbs = [f for f in os.listdir(a.export) if f.endswith(".glb")]
    p = draw(os.path.join(a.export, glbs[0]), os.path.join(a.export, "creature.json"), os.path.join(os.path.abspath(a.out), "glb-304.png"), a.samples)
    print(json.dumps(dict(file=p, **diff(p, a.reference))))


if __name__ == "__main__":
    main()

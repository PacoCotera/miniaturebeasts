"""R5 parity references: the Blender proxy's silhouettes of the species at its type and at each proportion locus' range ends, at az 0, 32, 90 and 180, 608 x 624, from the server's own render path
(wb/renderset.py: make_subject, Proxy.silhouette). Run under the bpy venv:
  bpyvenv/bin/python parity_refs.py SPECIES.json OUTDIR
Writes OUTDIR/<variant>-az<az>.png (alpha is the picture) and OUTDIR/refs.json: per variant the species file with the locus applied (rig, keys) and the camera of each view
(the ortho width in sculpt units, the camera centre, azimuth, elevation) so the browser can draw the same view."""
import copy
import json
import os
import sys
import time

BODY = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import numpy as np

import genomeapply as GA
from wb import renderset as RS, pngio

AZ = (0, 32, 90, 180)
SIZE = (608, 624)


def variants(doc):
    out = [("type", doc)]
    for e in doc["genome"]["loci"]:
        if not e.get("moves") or e["op"] != "blend" or not (e["locus"].startswith("form.")):
            continue
        lo, hi = e["range"]
        for tag, v in (("lo", lo), ("hi", hi)):
            d = copy.deepcopy(doc)                                    # a mesh file has no cage to materialise: the locus' moves act on the file's rig and keys as they are
            GA.apply_locus(d, e, v)
            out.append((f"{e['locus'].replace('form.', '')}-{tag}", d))
    return out


def main():
    spec_path, out = sys.argv[1], os.path.abspath(sys.argv[2])
    os.makedirs(out, exist_ok=True)
    doc = json.load(open(spec_path))
    scratch = os.path.join(out, "_scratch")
    os.makedirs(scratch, exist_ok=True)
    px = RS.Proxy(scratch)
    meta = dict(species=doc["id"], size=list(SIZE), variants={})
    t0 = time.time()
    for name, d in variants(doc):
        subj = RS.make_subject(d, "type", scratch)
        views = {}
        for az in AZ:
            fn = os.path.join(out, f"{name}-az{az}.png")
            img = px.silhouette(subj, az, SIZE, fn)
            pngio.write(fn, img)
            pngio.write(os.path.join(out, f"clay-{name}-az{az}.png"), RS.neutral_shade(px.clay(subj, az, SIZE, os.path.join(scratch, "c.png"))))   # the studio's clay, for the sheet's pictures beside the live ones
            right, up, fwd, pos_dir = px.P.basis(float(az), px.P.EL)
            m = np.array(px.pr.cam.matrix_world)
            pos = m[:3, 3]
            views[str(az)] = dict(ortho=float(px.pr.cam.data.ortho_scale), centre=[float(c) for c in pos - 12.0 * pos_dir], az=az, el=float(px.P.EL))
        meta["variants"][name] = dict(rig=d.get("rig"), keys=d.get("keys"), signature=d.get("signature"), views=views)
        print(f"[{time.time() - t0:6.1f}s] {name}", flush=True)
    json.dump(meta, open(os.path.join(out, "refs.json"), "w"), indent=1)


if __name__ == "__main__":
    main()

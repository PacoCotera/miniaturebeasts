"""M2, M3: species-mark-{SNN}-10 and -15, cut from the frame's 5x5 glyph (station-gate prototypes/workbench/frames/species-SNN.json).
Each cell becomes a k x k block: '#' -> fog at alpha 255, '.' -> alpha 0 with RGB 0,0,0. No smoothing, edge or padding."""
import json
import numpy as np
from PIL import Image
from kitlib import sg_bytes, sha, pal, save, file_sha, iou, ink_mask, values, clear_ok, measures_update

FOG = pal()["fog"]
rec = {}
for n in range(1, 17):
    sid = f"S{n:02d}"
    path = f"prototypes/workbench/frames/species-{sid}.json"
    b = sg_bytes(path); glyph = json.loads(b)["glyph"]
    g = np.array([[c == "#" for c in row] for row in glyph], bool)
    assert g.shape == (5, 5)
    for k in (2, 3):
        a = np.zeros((5 * k, 5 * k, 4), np.uint8)
        big = np.kron(g, np.ones((k, k), bool))
        a[big] = FOG + (255,)
        im = Image.fromarray(a, "RGBA")
        name = f"species-mark-{sid}-{5 * k}"
        p = save(im, name)
        im2 = Image.open(p)
        m = ink_mask(im2)
        vals = values(im2)
        reduced = m.reshape(5, k, 5, k).all(axis=(1, 3))
        blocks_uniform = bool((m.reshape(5, k, 5, k).all(axis=(1, 3)) == m.reshape(5, k, 5, k).any(axis=(1, 3))).all())
        r = {"size": [5 * k, 5 * k], "source": f"station-gate {path}", "source_sha256": sha(b), "glyph": glyph,
             "values": len(vals), "only_fog_and_clear": vals <= {FOG + (255,), (0, 0, 0, 0)}, "clear_ok": clear_ok(im2),
             "ink": int(m.sum()), "ink_expected": int(k * k * g.sum()), "blocks_uniform": blocks_uniform,
             "reduced_equals_glyph": bool((reduced == g).all()), "iou_vs_glyph_raster": round(iou(m, big), 3),
             "sha256": file_sha(p), "script": "guides/cut-marks.py"}
        r["pass"] = (r["values"] == 2 and r["only_fog_and_clear"] and r["clear_ok"] and r["ink"] == r["ink_expected"]
                     and r["blocks_uniform"] and r["reduced_equals_glyph"] and r["iou_vs_glyph_raster"] == 1.0)
        rec[name] = r
measures_update("M2_M3_species_marks", rec)
print(sum(r["pass"] for r in rec.values()), "of", len(rec), "pass")

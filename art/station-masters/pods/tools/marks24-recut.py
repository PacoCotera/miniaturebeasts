"""Recut the sixteen mark-species-SNN-24x24 (AD sign-off 2026-10-23 23:46) with tools/marks.py's own species rule, unchanged:
each '#' cell of the frame's 5x5 glyph a 3x3 square at a 4 px pitch from (2, 2), bone with its top row and left column white; '.' cells clear.
The frames are read from station-gate (SG clone, REV default c4be3673) with git show, never from this branch's stale prototypes/workbench/frames copy
(schema mb-species-frame/2, the retired glyphs, which the pass-27 cut read). Only the species rows of slices/manifest.json and status.json change.
SG=<station-gate clone> python3 -I tools/marks24-recut.py"""
import hashlib, json, os, subprocess
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
SG = os.environ.get("SG", "../station-gate"); REV = os.environ.get("REV", "c4be3673")
def show(p): return subprocess.run(["git", "-C", SG, "show", f"{REV}:{p}"], check=True, capture_output=True).stdout
PAL = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.loads(show("prototypes/ui/palettes/station.json"))["colours"]}
NOTE = "recut from the redrawn glyphs, AD 2026-10-23 23:46; the pass-27 cut used the retired glyphs"
man = json.load(open("slices/manifest.json")); st = json.load(open("slices/status.json"))
checks = {}
for i in range(1, 17):
    sp = f"S{i:02d}"; path = f"prototypes/workbench/frames/species-{sp}.json"; b = show(path); d = json.loads(b); rows = d["glyph"]
    im = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    for r, row in enumerate(rows):                       # marks.py's rule, unchanged
        for c, ch in enumerate(row):
            if ch != "#": continue
            for dy in range(3):
                for dx in range(3):
                    im.putpixel((2 + 4 * c + dx, 2 + 4 * r + dy), PAL["white" if (dx == 0 or dy == 0) else "bone"] + (255,))
    name = f"mark-species-{sp}-24x24"; p = f"slices/{name}.png"; im.save(p, optimize=True)
    a = np.asarray(Image.open(p).convert("RGBA")); ink = a[..., 3] > 128
    dec = ["".join("#" if ink[2 + 4 * r:5 + 4 * r, 2 + 4 * c:5 + 4 * c].all() else "." for c in range(5)) for r in range(5)]
    ref = np.zeros((24, 24), bool)                       # the glyph raster at the 24 geometry
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch == "#": ref[2 + 4 * r:5 + 4 * r, 2 + 4 * c:5 + 4 * c] = True
    u = (ink | ref).sum(); iou = float((ink & ref).sum() / u) if u else 1.0
    clear_ok = bool(np.isin(a[..., 3], [0, 255]).all() and (a[a[..., 3] == 0][:, :3] == 0).all())
    sha = hashlib.sha256(open(p, "rb").read()).hexdigest()
    checks[sp] = {"decodes_to_glyph": dec == rows, "iou": round(iou, 3), "clear_ok": clear_ok, "frame_sha256": hashlib.sha256(b).hexdigest(), "sha256": sha}
    m = man[name]
    m.update({"src": f"station-gate {REV} {path} glyph (sha256 {checks[sp]['frame_sha256']})", "sha256": sha, "status": "new", "signed_in": None, "status_note": NOTE})
    st[name] = {"status": "new", "signed_in": None, "note": NOTE}
json.dump(man, open("slices/manifest.json", "w"), indent=1); json.dump(st, open("slices/status.json", "w"), indent=1)
json.dump(checks, open("marks/marks24-recut-checks.json", "w"), indent=1)
for sp, c in checks.items(): print(sp, c["decodes_to_glyph"], c["iou"], c["clear_ok"], c["frame_sha256"][:12], c["sha256"][:12])

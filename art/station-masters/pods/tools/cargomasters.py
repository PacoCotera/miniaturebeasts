"""Cargo masters for the build (the lead's note on the art director's finish pass, T-20261016-197): promote crate-lifting-256x200 and pods-hatch-open-160x260
from concepts/panels-cargo/ at the anchors the art director measured, and cut hatch-shut-160x260 and berth-shut-256x292 from the placed
cargo-bay-shut-976x304 (no painting). Rows written directly into slices/manifest.json and slices/status.json (never tools/status.py).
usage (from art/station-masters/pods): python3 -I tools/cargomasters.py"""
import json, hashlib, shutil
from PIL import Image
man = json.load(open("slices/manifest.json")); st = json.load(open("slices/status.json"))
def row(n, size, src, made, note, status="new"):
    man[n] = {"size": list(size), "rect": None, "src": src, "made": made, "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest(), "status": status, "signed_in": None, "status_note": note}
    st[n] = {"status": status, "signed_in": None, "note": note}
for n, made in (("crate-lifting-256x200", "the yellow crate with its lid lifted and warm light in the gap, contents not visible; the body is the width of crate-sealed-256x176 (x 10-244) and its foot sits 13 px above the canvas foot, so it stands where crate-sealed-256x176 stands, the extra height above. Anchors: foot row 187 of 200."),
                ("pods-hatch-open-160x260", "the Pods hatch swung open, six empty pod wells and a narrow find strip at its foot. Well centres (49, 60), (103, 58), (49, 120), (103, 119), (50, 180), (104, 182) as the art director measured them.")):
    shutil.copy(f"concepts/panels-cargo/{n.replace('crate-lifting', 'crate-lifting').replace('pods-hatch-open', 'pods-hatch-open')}.png", f"slices/{n}.png")
    row(n, Image.open(f"slices/{n}.png").size, "source/raw/panels-cargo-*.jpg (gemini-3-pro-image, one request each, the panels-cargo job), keyed and set at 1x by tools/panelscargo_cut.py", made,
        "new (10-18): promoted from concepts/panels-cargo/ on the lead's note and the art director's finish pass; awaiting the art director's judgement (not signed)")
door = Image.open("slices/cargo-bay-shut-976x304.png").convert("RGBA")
for n, box, made in (("hatch-shut-160x260", (40, 20, 200, 280), "the shut Pods hatch, cut 1:1 from cargo-bay-shut-976x304 at (40, 20); the stills place it at the hatch's spot and put ring-hatch-80x56 at +(40, 16)"),
                     ("berth-shut-256x292", (360, 6, 616, 298), "an empty berth, slatted and shut: cut 1:1 from the slatted door of cargo-bay-shut-976x304 at (360, 6), clear of both latches")):
    door.crop(box).save(f"slices/{n}.png", optimize=True)
    row(n, (box[2] - box[0], box[3] - box[1]), "slices/cargo-bay-shut-976x304.png", made, "derived-from-concept (10-18): a straight crop of the placed shut bay, no painting; awaiting the art director's judgement (not signed)", "derived-from-concept")
json.dump(man, open("slices/manifest.json", "w"), indent=1); json.dump(st, open("slices/status.json", "w"), indent=1)
for n in ("crate-lifting-256x200", "pods-hatch-open-160x260", "hatch-shut-160x260", "berth-shut-256x292"): print(n, man[n]["size"], st[n]["status"])

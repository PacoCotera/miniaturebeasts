"""Writes slices/manifest.json and slices/status.json for the 37 Library kit masters from guides/measures.json (signed_in null: the art director signs)."""
import json, os
from PIL import Image
from kitlib import SLICES, HERE, file_sha

M = json.load(open(os.path.join(HERE, "measures.json")))
man, st = {}, {}
def add(fid, frm, status, note):
    p = os.path.join(SLICES, fid + ".png"); im = Image.open(p)
    man[fid] = {"file": fid + ".png", "size": list(im.size), "sha256": file_sha(p), "from": frm, "signed_in": None, "status": status}
    st[fid] = {"status": status, "signed_in": None, "note": note}

g = M["M1_library_ground_1024x522"]
add("library-ground-1024x522", {"source": g["source"], "source_sha256": g["source_sha256"], "script": g["script"]}, "derived-from-concept",
    "the approved Library renders' own paper (specimen3.js finish, seed 7, grain 4), re-based on libGround by the brief's recipe; awaiting the art director")
for fid, r in M["M2_M3_species_marks"].items():
    add(fid, {"source": r["source"] + " (glyph)", "source_sha256": r["source_sha256"], "script": r["script"]}, "new",
        f"cut from the signed frame glyph at {r['size'][0] // 5}x per cell, fog, 1-bit clear; awaiting the art director")
for key, fid, status, note in [
    ("M4_library_seed_24x24", "library-seed-24x24", "derived-from-concept", "the approved render's seedMark geometry (compose-all2-v3.js), by rule then hand-finished at the tips and the edge line; awaiting the art director"),
    ("M5_wish_mark_12", "wish-mark-12", "derived-from-concept", "the approved render's star5 geometry (compose-species.js), by rule; no hand change needed; takes the id from the pass-81 glint (AD 2026-10-23 23:28); awaiting the art director"),
    ("M6_look_disc_open_16", "look-disc-open-16", "new", "typed by rule: 1 px ring, diameter 11, frostS, 1-bit clear (sheet-art.md 2); awaiting the art director"),
    ("M7_library_sitting_16x12", "library-sitting-16x12", "new", "drawn by hand from the house matte sitting frame (home-sitting-32x24 at station-gate c4be3673, the drawing of sitting-frame-held-48x40); awaiting the art director")]:
    r = M[key]
    add(fid, {"source": r.get("source", "typed by the rule in the brief (no source file)"), "source_sha256": r.get("source_sha256"), "script": r["script"]}, status, note)
assert len(man) == 37   # the brief's table: M1 1 + M2 16 + M3 16 + M4-M7 1 each (its heading says eight masters, 39 files)
json.dump(man, open(os.path.join(SLICES, "manifest.json"), "w"), indent=1)
json.dump(st, open(os.path.join(SLICES, "status.json"), "w"), indent=1)
print(len(man))

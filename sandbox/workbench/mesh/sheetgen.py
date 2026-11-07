"""Shared sheet pieces: copy images into loika/img, cells with captions."""
import os, shutil
MASTER = "/home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-%s.png"
def make_cp(loika):
    img = os.path.join(loika, "img"); os.makedirs(img, exist_ok=True)
    def cp(src, name):
        shutil.copy(src, os.path.join(img, name)); return "img/" + name
    return cp
def cell(src, cap, zoom=1):
    return f"<div class='cell'><img src='{src}' style='zoom:{zoom}'><div class='cap'>{cap}</div></div>"
def refs(cp, out):
    sdf = lambda s: os.path.join(out, f"sdf-S01-{s}.png")
    m = {304: cp(MASTER % "304x312", "master-304.png"), 96: cp(MASTER % "96x88", "master-96.png"), 48: cp(MASTER % "48x48", "master-48.png")}
    d = {s: cp(sdf(s), f"sdf-{s}.png") for s in (304, 96, 48)}
    return m, d

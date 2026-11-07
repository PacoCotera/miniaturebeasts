import os, sys, json, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "tools"))
from sheetlib import page, shot
from sheetgen import *
S6, S5, LOIKA = [os.path.abspath(a) for a in sys.argv[1:4]]; cp = make_cp(LOIKA)
r = json.load(open(os.path.join(S6, "rig-report.json")))
t = {k: cp(os.path.join(S6, f"tjs-{k}.png"), f"s6-tjs-{k}.png") for k in ("rest", "breathe", "blink", "walk", "walk2", "face-rest", "face-blink")}
sprite = cp(os.path.join(S5, "loika-304.png"), "s5-loika-304.png")
shutil.copy(os.path.join(S6, "loika.glb"), os.path.join(LOIKA, "loika.glb")); shutil.copy(os.path.join(S6, "viewer.html"), os.path.join(LOIKA, "viewer.html"))
hs = r["head_still"]
body = ("<h1>Stop 6: the rig, the clips and the glb, in three.js (pinned commit 3f8dfb8fd)</h1><div class='sub'>Frames of the same glb that viewer.html loads (three.js r17x, SwiftShader in headless Chromium). Rest = the stand pose, which every clip carries on the head bone. "
        f"{r['bones']} bones, level-2 geometry, shape keys as morph targets (breath, blink.L, blink.R), clips breathe 3.04 s, blink 0.21 s, walk 1.04 s, stand. glb {r['glb']['bytes']//1024} KB. Built and exported in {r['total_s']:.1f} s.</div>"
        "<h2>Clips</h2><div class='row'>" + cell(t["rest"], "rest (stand pose)") + cell(t["breathe"], "breathe peak (1.5 s)") + cell(t["blink"], "blink peak") + cell(t["walk"], "walk, phase 0.25") + cell(t["walk2"], "walk, phase 0.75: the other diagonal") + "</div>"
        "<h2>The face, rest and blink, and the Cycles stand sprite</h2><div class='row'>" + cell(t["face-rest"], "face, rest") + cell(t["face-blink"], "face, blink peak: both lids down over the discs") + cell(sprite, "Cycles stand sprite 304 (level-4 surface, house light)") + "</div>"
        f"<h2>Test</h2><table><tr><th>Check</th><th>Value</th></tr><tr><td>head bounding-box size at the breath peak vs rest</td><td>{hs['size_delta']:.1e} H (limit 1e-4)</td></tr><tr><td>head's move at the breath peak</td><td>{max(abs(x) for x in hs['move']):.1e} H: the head is pinned in armature space while the neck bone lifts the chest by 0.012 H</td></tr></table>")
html = os.path.join(LOIKA, "6-clips.html"); page("Stop 6", body, html); shot(html, os.path.join(LOIKA, "6-clips.png"), 1560)

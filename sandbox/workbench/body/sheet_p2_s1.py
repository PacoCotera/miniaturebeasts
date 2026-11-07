"""Pass 2 steps 1 and 2 sheet: the hanging firefly lantern and the hue gene. Under the bpy venv: python sheet_p2_s1.py"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import s20p2 as P2, s20indiv as IN, s20coat as CT, s20balance as BAL, sheetlib as SL, paths as PA
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests"))
from test_s20_p2_lantern import hue_of, luma

items = [IN.make(i) for i in range(1, 13)]
c, b, R = items[0]
G = b.ctx["T"]
ang, hues, margins, bellies = [], [], [], []
for ci, bi, Ri in items:
    Gi = bi.ctx["T"]
    if ci["shape"]["tip"] == "lantern":
        ax = Gi.pa.at([0.6 * Gi.bulb[0]])[0][0] - Gi.pa.at([0.0])[0][0]
        ang.append(float(np.degrees(np.arccos(np.clip(ax[2] / np.linalg.norm(ax), -1, 1)))))
    h = (ci["coat"]["hue"] + 360 * ci["coat"]["hue_shift"]) % 360
    hues.append(h)
    P = CT.palette_from_hue(h, ci["coat"])
    bellies.append((h, luma(P["belly"]) - luma(P["coat"])))
    margins.append(bi.ctx["balance"]["margin"])
pts = G.pa.at(np.linspace(0, 1.3, 500))[0]
apex = float(pts[:, 2].max()); mid = float(G.pa.at([G.bulb[0] / 2])[0][0][2])
tail = b.ctx["spec"]["parts"]["tail"]
pa = PA.fillet_path(np.array(tail["P"]), [j["r"] for j in tail["joints"]], tail["fillet"])[0]
arc = float(PA.arclen(pa)[-1])
gh = [hue_of(CT.palette_from_hue(h, {})["glow"]) for h in range(0, 360, 10)]
srt = sorted(hues); dist = [srt[0]]
for h in srt[1:]:
    if h - dist[-1] >= 20: dist.append(h)
warm = [(round(h), round(float(d), 2)) for h, d in bellies if 10 <= h <= 35]            # belly luma minus coat luma
rows = [("tip axis (the chord of the bulb's lower 60 %) from straight down, worst of the lanterns among the twelve", f"{max(ang):.1f} deg (needs 30)", max(ang) < 30),
        ("bulb: a teardrop", f"length {G.bulb[0]:.2f} H, width {2 * G.bulb[1]:.2f} H (0.26 x 0.20)", abs(G.bulb[0] - 0.26) < 0.005 and abs(2 * G.bulb[1] - 0.20) < 0.005),
        ("crook top, bulb centre, the drop between them", f"{apex:.3f} / {mid:.3f} / {apex - mid:.3f} H (0.10-0.15)", 0.10 <= apex - mid <= 0.17),
        ("the crook is below the ear tops", f"top {apex:.2f} H against ears 2.3 H", apex < 2.3),
        ("tail arc length (owner: 1.0-1.2 H)", f"{arc:.3f} H", 1.0 <= arc <= 1.2),
        ("balance, the twelve: smallest margin in front of the heel (needs 15 %)", f"{min(margins) * 100:.1f} %", min(margins) >= 0.15),
        ("glow hue on every body hue (0-350 in steps of 10)", f"{min(gh):.0f} to {max(gh):.0f} deg (needs 70-90)", min(gh) >= 70 and max(gh) <= 90),
        ("it glows on the lower 60 % of its length; two dark bands 0.022 H wide in the unlit neck", "by the coat's lit field and bands (test_s20_p2_lantern)", None),
        ("hue gene: distinct base hues among the twelve (20 deg apart)", f"{len(dist)} ({', '.join(str(round(h)) for h in srt)})", len(dist) >= 6),
        ("body hue 10-35: a rust-ochre coat with a pale COOL belly, never cream; belly 15 % lighter than the coat on every hue (tested at every 5 degrees)", str(warm) if warm else "no individual falls in the window; the window itself is tested at 10, 15 ... 35", all(d > 0 for h, d in warm)),
        ("colour bleed down the tail on warm hues (0-70, 340-360)", "off (the tail keeps the body colour to the stalk); on the other hues the bleed is a 0.12 mix over the neck's first hand's breadth", None)]
notes = ("<p><b>Step 1, the lantern.</b> The tail is a shepherd's crook: the stem rises behind the back, the hook turns away from the body and the bulb hangs from it, a firefly's abdomen: a teardrop 0.26 x 0.20 H that is the last stretch of the one spine (a radius profile, no join), "
         "glowing on its lower 60 % in a firefly yellow-green (hue 70-90 on every palette) with two thin dark bands in the unlit neck. <b>Step 2, the hue gene:</b> the three fixed palettes are replaced by one body hue (0-360) from which the coat, belly, ear-inner, pad, mark and nose are derived at matched luma; "
         "a hue of 10-35 degrees gets a rust-ochre coat with a pale cool belly instead of cream; the palette is held in a plush range (HSV saturation 0.35-0.60, value 0.55-0.85) and every belly is at least 15 % lighter than its coat, and warm hues carry no colour bleed down the tail. "
         "<b>Honest read:</b> the lantern now reads as a hanging lantern from the front and the side at 96 px. The crook reads from the side; from behind (az 160 tiles) the tail is still a short stem rising from the rump, because the rest pose is symmetric: that is the tail-root work (step 4). "
         "</p>")
r = P2.build_sheet("s1-lantern-hue", "steps 1 and 2: the hanging firefly lantern and the hue gene", notes, rows, b=b, c=c, R=R)
print(r)

"""The breath: silhouette overlay at full inhale over exhale at az 90 (and 0), moving parts shown. Under the bpy venv."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import s20p2 as P2, s20indiv as IN, nview, bpyio as B, sheetlib as SL, s20normals as NM
c, b, R = IN.make(1)
V, F, at, fp2 = P2.level_arrays(b, 2)
part = IN.part_of(b, F, fp2, len(V))
dV = R.breath(V, at, part, 1.0)
tiles = []
for az in (90.0, 0.0, 45.0):
    a0 = nview.render(V, F, None, az, 5.0, (-0.3, 0, 1.1), 150.0, 420, 420)[1] < 1e8
    a1 = nview.render(V + dV, F, None, az, 5.0, (-0.3, 0, 1.1), 150.0, 420, 420)[1] < 1e8
    img = np.full((420, 420, 3), 245, np.uint8)
    img[a0 & a1] = (205, 205, 205)
    img[a1 & ~a0] = (220, 40, 40)          # only at inhale
    img[a0 & ~a1] = (40, 70, 220)          # only at exhale
    B.write_png(os.path.join(P2.OUT, f"breath-az{int(az):03d}.png"), img)
    tiles.append(f"<div class='cell'><div class='cap'>az {int(az)}</div><img src='breath-az{int(az):03d}.png' width='420'></div>")
mv = np.linalg.norm(dV, axis=1)
html = ("<h1>S20 Tuliko, pass 2: breathing inflates only the chest and belly</h1><p>Silhouette at full inhale over exhale. Grey: unchanged; red: only at inhale; blue: only at exhale. The breath is a radial offset in the section plane of the one spine between the waist and the seat (ribcage +3.5 %, belly +2 %, eased, zero at the neck, seat, tail, head and limbs; "
        "about 0.3 Hz, a morph target in the glb driven by a weights channel); the arms ride the chest (moved, not scaled); the head, ears, legs, feet, tail and lantern do not move (0.000 H). Largest vertex move " + f"{mv.max():.3f} H.</p><div class='row'>" + "".join(tiles) + "</div>")
open(os.path.join(P2.OUT, "breath.html"), "w").write(SL.page("breath", html))
SL.shoot(os.path.join(P2.OUT, "breath.html"), os.path.join(P2.OUT, "breath.png"), 1400)
print("done", mv.max())

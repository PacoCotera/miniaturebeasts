import hashlib, re, struct
from PIL import Image
R = "/home/mb/mb/pool/kilpo-game-2/"
C = R + "runs/kilpo-game-2/cuts/"
OUT = R + "runs/kilpo-game-2/composites/"
M = R + "prototypes/ui/assets/masters/"
P = M + "pods/"
CELLS = [
 ("tiptap-48x48", "mibi-adult-S11-48x48"), ("tiptap-96x88", "mibi-adult-S11-96x88"),
 ("tiptap-304x312", "mibi-adult-S11-304x312"), ("juv-48x48", "mibi-juvenile-S11-48x48"),
 ("juv-96x88", "mibi-juvenile-S11-96x88"), ("juv-304x312", "mibi-juvenile-S11-304x312"),
 ("asleep-304x312", "mibi-adult-S11-curl-304x312"), ("juvasleep-304x312", "mibi-juvenile-S11-curl-304x312"),
]
import os
os.makedirs(OUT, exist_ok=True)
idx = open(M + "index.json").read()
prov = open(M + "provenance.json").read()
for cell, dest in CELLS:
    fig = Image.open(C + "k710-" + cell + ".png").convert("RGBA")
    sh = Image.open(C + "k710-" + cell + "-shadow.png").convert("RGBA")
    assert fig.size == sh.size, (cell, fig.size, sh.size)
    comp = Image.new("RGBA", fig.size, (0, 0, 0, 0))
    comp.alpha_composite(sh)
    comp.alpha_composite(fig)
    path = P + dest + ".png"
    comp.save(path)  # no squeeze, no resize
    comp.save(OUT + dest + ".png")
    data = open(path, "rb").read()
    sha = hashlib.sha256(data).hexdigest()
    w, h = struct.unpack(">II", data[16:24])
    new_idx = '  "%s": {"group":"pods","w":%d,"h":%d,"bytes":%d,"sha":"%s"},' % (dest, w, h, len(data), sha[:12])
    idx, n1 = re.subn(r'^  "%s": \{.*\},?$' % re.escape(dest), lambda m: new_idx, idx, flags=re.M)
    base = "mibi-art/art-jobs/2026-11-20-kilpo-7-10/cuts/k710-%s" % cell
    new_prov = ('  "%s": {"sha256":"%s","signed":"","step":"composite: signed k710 plain cut over its own signed k710 shadow layer, same canvas, shadow under figure, layout only (PIL alpha_composite, no repaint, no resize, no recolour, not squeezed)","parents":["%s.png","%s-shadow.png"],"from":"%s.png"},'
                % (dest, sha, base, base, base))
    prov, n2 = re.subn(r'^  "%s": \{.*\},?$' % re.escape(dest), lambda m: new_prov, prov, flags=re.M)
    print(dest, n1, n2, sha[:12])
open(M + "index.json", "w").write(idx)
open(M + "provenance.json", "w").write(prov)

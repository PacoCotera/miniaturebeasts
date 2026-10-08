#!/bin/sh
# Assemble the hut pieces in Aseprite on the VM and bring them back trimmed: work/huts-pre/*.png -> hut-X.aseprite (3 tagged frames each)
# -> work/huts/hut-X-state.png; the .aseprite files to work/huts-aseprite/. Run from art/companion-48/ after hut-states.py and hut-draw.py.
set -e
W=review-place/work; HUTS=A,B,C,D,Ch,Dh
tar -C $W/huts-pre -cf - . | mb-vm 'rm -rf ~/c48/huts && mkdir -p ~/c48/huts/in ~/c48/huts/out && tar -C ~/c48/huts/in -xf -'
mb-vm 'cat > ~/c48/aseprite-huts.lua' < tools/aseprite-huts.lua
mb-vm "cd ~/c48/huts && aseprite -b --script-param indir=in --script-param outdir=out --script-param huts=$HUTS --script ../aseprite-huts.lua" | tail -1
rm -rf /tmp/hut-vm && mkdir -p /tmp/hut-vm $W/huts $W/huts-aseprite
mb-vm 'cd ~/c48/huts/out && tar -cf - *' > /tmp/hut-vm.tar && tar -C /tmp/hut-vm -xf /tmp/hut-vm.tar
cp /tmp/hut-vm/*.aseprite $W/huts-aseprite/
python3 -I - <<'PY'
import glob, os, sys
sys.path.insert(0, "tools")
import numpy as np
from PIL import Image
import quant
W = "review-place/work"; bad = 0
for f in sorted(glob.glob("/tmp/hut-vm/hut-*-*.png")):
    a = np.asarray(Image.open(f).convert("RGBA")); ys, xs = np.where(a[..., 3] > 0); crop = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    src = np.asarray(Image.open(os.path.join(W, "huts-pre", os.path.basename(f))).convert("RGBA")); m = src[..., 3] > 0
    bad += not (src.shape == crop.shape and np.array_equal(src[..., 3], crop[..., 3]) and np.array_equal(src[m], crop[m]))
    Image.fromarray(crop, "RGBA").save(os.path.join(W, "huts", os.path.basename(f)))
print("hut pieces", len(glob.glob("/tmp/hut-vm/hut-*-*.png")), "; differing from the drawn pieces after the Aseprite round trip:", bad)
PY

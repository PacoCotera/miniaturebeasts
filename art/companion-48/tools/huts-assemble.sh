#!/bin/sh
# Assemble hut pieces in Aseprite on the VM and bring them back trimmed: PRE_DIR/hut-X-state.png -> hut-X.aseprite (3 tagged frames each)
# -> OUT_DIR/hut-X-state.png; the .aseprite files to ASE_DIR. usage (from art/companion-48/): sh tools/huts-assemble.sh HUTS PRE_DIR OUT_DIR ASE_DIR   (HUTS e.g. B or A,B,C,D)
set -e
HUTS=$1; PRE=$2; OUTD=$3; ASE=$4
tar -C $PRE -cf - . | mb-vm 'rm -rf ~/c48/huts && mkdir -p ~/c48/huts/in ~/c48/huts/out && tar -C ~/c48/huts/in -xf -'
mb-vm 'cat > ~/c48/aseprite-huts.lua' < tools/aseprite-huts.lua
mb-vm "cd ~/c48/huts && aseprite -b --script-param indir=in --script-param outdir=out --script-param huts=$HUTS --script-param cw=${CW:-64} --script-param ch=${CH:-64} --script ../aseprite-huts.lua" | tail -1
rm -rf /tmp/hut-vm && mkdir -p /tmp/hut-vm $OUTD $ASE
mb-vm 'cd ~/c48/huts/out && tar -cf - *' > /tmp/hut-vm.tar && tar -C /tmp/hut-vm -xf /tmp/hut-vm.tar
cp /tmp/hut-vm/*.aseprite $ASE/
PRE=$PRE OUTD=$OUTD python3 -I - <<'PY'
import glob, os, sys
sys.path.insert(0, "tools")
import numpy as np
from PIL import Image
import quant
PRE, OUTD = os.environ["PRE"], os.environ["OUTD"]; bad = 0
for f in sorted(glob.glob("/tmp/hut-vm/hut-*-*.png")):
    a = np.asarray(Image.open(f).convert("RGBA")); ys, xs = np.where(a[..., 3] > 0); crop = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    src = np.asarray(Image.open(os.path.join(PRE, os.path.basename(f))).convert("RGBA")); m = src[..., 3] > 0
    bad += not (src.shape == crop.shape and np.array_equal(src[..., 3], crop[..., 3]) and np.array_equal(src[m], crop[m]))
    Image.fromarray(crop, "RGBA").save(os.path.join(OUTD, os.path.basename(f)))
print("hut pieces", len(glob.glob("/tmp/hut-vm/hut-*-*.png")), "; differing from the drawn pieces after the Aseprite round trip:", bad)
PY

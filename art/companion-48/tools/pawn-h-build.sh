#!/bin/sh
# The pawn from H, end to end (from art/companion-48/): the hand pass over the Retro Diffusion frames, the Aseprite assembly (headless, through $REMOTE, a remote-shell wrapper), the pieces into work/pawn.
set -e
REMOTE="${REMOTE:?a remote-shell wrapper}"
T=/tmp/pawn-h; rm -rf $T $T-vm; mkdir -p $T $T-vm
python3 -I tools/pawn-h-pass.py review-place/sources/rd-pawn-h $T
tar -C $T -cf - . | $REMOTE 'rm -rf ~/c48/pawn && mkdir -p ~/c48/pawn/in ~/c48/pawn/out && tar -C ~/c48/pawn/in -xf -'
$REMOTE 'cat > ~/c48/aseprite-pawn.lua' < tools/aseprite-pawn.lua
$REMOTE 'cd ~/c48/pawn && aseprite -b --script-param indir=in --script-param outdir=out --script ../aseprite-pawn.lua' | tail -1
$REMOTE 'cd ~/c48/pawn/out && tar -cf - *' > $T-vm.tar && tar -C $T-vm -xf $T-vm.tar
mkdir -p review-place/work/pawn-aseprite; cp $T-vm/pawn.aseprite review-place/work/pawn-aseprite/; cp $T-vm/pawn-*-*.png review-place/work/pawn/
T=$T python3 -I - <<'PY'
import glob, os
import numpy as np
from PIL import Image
T = os.environ["T"]; bad = 0
for f in glob.glob(T + "/*.png"):
    a = np.asarray(Image.open(f).convert("RGBA")); b = np.asarray(Image.open("review-place/work/pawn/" + os.path.basename(f)).convert("RGBA")); m = a[..., 3] > 0
    bad += not (np.array_equal(a[..., 3], b[..., 3]) and np.array_equal(a[m], b[m]))
print("pawn frames", len(glob.glob(T + "/*.png")), "; differing after the Aseprite round trip:", bad)
PY

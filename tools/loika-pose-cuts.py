"""The watch view's and the field card's pictures of the wild Loika (w6b-build-1): her four poses in her plain coat and in her saddle coat, each a 228 x 234 cut of the signed 304 x 312 master
by the same route as every Companion picture (tools/companion-cut.py: x0.75, hard alpha, small palette, no paint, no model call).
usage: python3 -I tools/loika-pose-cuts.py REPO_ROOT [colours=64]
  -> prototypes/ui/assets/masters/cuts/pose/loika-<plain|saddle>-<stand|shake|calm|curl>-228x234.png
Poses with no signed master are listed and left as named empty slots."""
import os, sys, importlib.util

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("companion_cut", os.path.join(here, "companion-cut.py"))
cc = importlib.util.module_from_spec(spec); spec.loader.exec_module(cc)

POSES = ["stand", "shake", "calm", "curl"]
COATS = {"plain": "mibi-adult-S01", "saddle": "mibi-adult-S01-between-between-lay-saddle"}


def master(coat, pose):
    base = COATS[coat]
    return base + "-304x312.png" if pose == "stand" else base + "-" + pose + "-304x312.png"


def main(root, N):
    src = os.path.join(root, cc.MASTERS); dst = os.path.join(root, cc.COATS_DIR, "pose"); os.makedirs(dst, exist_ok=True)
    for coat in COATS:
        for pose in POSES:
            m = master(coat, pose); p = os.path.join(src, m)
            if not os.path.exists(p): print("no master:", m, "(empty slot)"); continue
            o, n, box = cc.cut(p, N); out = os.path.join(dst, "loika-%s-%s-228x234.png" % (coat, pose)); cc.save(o, out)
            print(os.path.basename(out), "colours", n, "box", box)


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 64)

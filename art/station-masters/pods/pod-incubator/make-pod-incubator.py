"""T-20261016-63: the pod class at 224 x 272 for the Incubator (class key "incubator" for pods.json classes.pod), made at that size by Pods'
own builder: tools/build.py pods() reduces one signed pod painting (source/raw pod-identified, pod-loika, pod-band; the crop 1328 x 1472) with
Lanczos to each class's box, never enlarging. This runs that same function for the one new box and writes only its layers; the existing
classes are not touched. As a check it first rebuilds the large class into a scratch folder and compares it byte for byte with the signed
slices (the function is the signed one).
usage: python3 -I pod-incubator/make-pod-incubator.py SCRATCH_DIR   (run in art/station-masters/pods)"""
import sys, os, importlib.util, hashlib, json, numbers, decimal, fractions   # the stdlib ones first: tools/numbers.py would shadow them
scratch = sys.argv[1]; os.makedirs(scratch, exist_ok=True); sys.argv = ["build.py"]   # build.py reads sys.argv at load
spec = importlib.util.spec_from_file_location("build", "tools/build.py"); B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)
def run(box, out):
    B.POD_BOX = box; B.OUT = out.rstrip("/") + "/"; B.MAN = {}; os.makedirs(out, exist_ok=True); B.pods(); return B.MAN
chk = run({"large": (144, 176)}, os.path.join(scratch, "large"))
same = [n for n in chk if os.path.exists(f"slices/{n}.png") and open(f"slices/{n}.png", "rb").read() == open(os.path.join(scratch, "large", n + ".png"), "rb").read()]
diff = [n for n in chk if n not in same]
print("large rebuilt:", len(chk), "layers;", len(same), "byte-identical to the signed slices;", "differing:", diff)
if diff: sys.exit("the builder does not rebuild the signed large class: stop")
man = run({"incubator": (224, 272)}, "slices")
json.dump(man, open("pod-incubator/made.json", "w"), indent=1)
print("incubator class:", sorted(man))
# the sealing band layer (pods.json podLayers.order: drawn for a sealed pod): pods() builds it from the band painting but writes it only in
# the old flat pass; it is made here the same way (the same crop, key and Lanczos reduction into the class box), checked first on the large class
import numpy as np
from PIL import Image
BB = (376, 288, 1704, 1760); bw, bh = BB[2] - BB[0], BB[3] - BB[1]
I, Bp = B.pod_src("pod-identified"), B.pod_src("pod-band")
lum = lambda a: a[..., :3] @ np.array([0.3, 0.59, 0.11])
db = np.clip((lum(I) - lum(Bp) - 30) / 50, 0, 1); db[:BB[1] + 150] = 0; db[BB[1] + 520:] = 0
Bd = Bp.copy(); Bd[..., 3] = db * 255; band = Bd[BB[1]:BB[3], BB[0]:BB[2]]
def put(arr, w, h):
    f = min(w / bw, h / bh); pw, ph = max(1, round(bw * f)), max(1, round(bh * f)); ox, oy = (w - pw) // 2, h - ph
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").resize((pw, ph), Image.LANCZOS)
    c = Image.new("RGBA", (w, h), (0, 0, 0, 0)); c.alpha_composite(im, (ox, oy)); return c
chk = np.asarray(put(band, 144, 176)); sig = np.asarray(Image.open("slices/pod-large-band.png").convert("RGBA"))
print("band check, large: px differing from the signed pod-large-band:", int((chk != sig).any(-1).sum()))
put(band, 224, 272).save("slices/pod-incubator-band.png", optimize=True); print("pod-incubator-band written")

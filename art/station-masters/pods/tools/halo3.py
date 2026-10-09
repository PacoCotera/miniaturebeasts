"""The halo figure, the set: mibi-halo-<SNN>-128x160-{mist,clear} for the species. Round 2 + the species outline fix.
The light is painted by the image tool over each species' silhouette (source/raw/halo-sil-<S>.png: cut from the standard painting where one exists, S01 S09 S12, else from the species frame's
placeholder render, S02..S16 side view, the cast shadow left out); the tool redraws outlines, and art never invents or changes a trait, so here each painted figure is MASKED with its ORIGINAL silhouette
(soft edge) and the soft halo kept about 6 px outside that mask; where the painting left part of the silhouette dark a dim fill of the figure's own cool colour keeps the species' own outline.
Then keyed from black (alpha = the brightest channel), graded to the brief (peak about 105 to 110 grey over black, the figure's mean 45 to 55), reduced from 4x with premultiplied alpha; the mist is a
diffusion of the corrected clear. usage: python3 -I tools/halo3.py [S01 S02 ...]"""
import json, os, hashlib, sys, importlib.util
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
def _load(n):
    sp = importlib.util.spec_from_file_location(n, f"tools/{n}.py"); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m
h1 = _load("halo"); h2 = _load("halo2"); K = 4; W, H = 512, 640
ALL = ["S%02d" % i for i in range(1, 17)]
def painted(sp):
    im = Image.open(f"source/raw/halo-{sp}-clear.jpg").convert("RGB").resize((W, H), Image.LANCZOS)
    a = np.asarray(im).astype(float); A = np.clip((a.max(2) / 255.0 - 0.04) / 0.96, 0, 1); C = np.where(A[..., None] > 0.02, a / np.maximum(A[..., None], 0.02), 0); return np.clip(C, 0, 255), A
def corrected(sp):
    M = np.load(f"source/work/halo-sil-{sp}.npy"); C, A = painted(sp); inside = M > 0.5
    dout = h1.edt(~inside) / K                                                              # px outside the silhouette (final-resolution px)
    ys, xs = np.where(inside); mean_col = C[inside & (A > 0.25)].mean(0) if (inside & (A > 0.25)).any() else np.array([160.0, 215.0, 235.0])
    Ms = np.asarray(Image.fromarray((M * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6 * K))).astype(float) / 255     # a 0.6 px soft edge, anti-aliased
    halo_w = np.clip(1 - dout / 6.0, 0, 1) ** 1.6 * (dout > 0)                               # about 6 px outside the mask
    fill = 0.20 * Ms                                                                         # the species' own outline, dim, where the painting left it dark
    din = h1.edt(inside) / K; core = 0.42 + 0.58 * np.clip(din / max(13.0, 0.55 * din.max()), 0, 1) ** 0.7              # the core of the body brighter, the edges falling away (a flat painted figure otherwise keeps its whole body bright)
    Ain = np.maximum(A * Ms * core, fill); Aout = A * halo_w * (1 - Ms) * 0.8
    Af = np.clip(Ain + Aout, 0, 1)
    Cf = np.where((A[..., None] > 0.12), C, mean_col[None, None, :])
    return np.dstack([Cf, Af * 255])
if __name__ == "__main__":
    which = [a for a in sys.argv[1:]] or ALL; man = json.load(open("slices/manifest.json")); rows = []
    for sp in which:
        if not os.path.exists(f"source/raw/halo-{sp}-clear.jpg"): print(sp, "no painted figure yet"); continue
        clear = h2.grade(corrected(sp)); mist = h2.mist_of(clear)
        for st, arr in (("clear", clear), ("mist", mist)):
            im = h2.reduce(arr); name = f"mibi-halo-{sp}-128x160-{st}"; im.save(f"slices/{name}.png", optimize=True)
            src = "the standard painting" if sp in ("S01", "S09", "S12") else "the species frame's placeholder render (side view)"
            man[name] = {"size": [128, 160], "rect": None, "src": f"halo-{sp}-clear.jpg over the {sp} silhouette from {src}", "made": f"the {sp} halo figure, {st}: " + ("a figure of soft cool light painted by the image tool, masked with the species' own silhouette (soft edge), a soft halo about 6 px outside it, graded to the brief" if st == "clear" else "a diffusion of the corrected clear figure, so the two cross-fade cleanly"), "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
            print(name, h2.stats(im))
    json.dump(man, open("slices/manifest.json", "w"), indent=1)

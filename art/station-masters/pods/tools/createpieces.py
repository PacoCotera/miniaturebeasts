"""Pass 113: the Create screen's hand-made pieces (Station art director's Create brief of Oct 10, geometry from station-layouts.md "Create" on main; no paid call).
 chamber-back-400x320 and chamber-front-400x320: the work tray in the housing: a panel back (the Incubator stage's own warm foam), an enamel rim (the sand of base-336x96, matte, a hairline edge), the floor 400x16 at (0, 304) in enamel with a bevel edge (a top face, a one-pixel darker bevel line, a front face; matte, no highlight, no glass edge). The front is the rim only, over the founder's feet: the floor's front lip (rows 310 to 319), nothing else. Materials taken from room-bench-stage-incubator and base-336x96 (their measured means).
 plate-name-88x24: cut from the signed plate-name 9-slice (insets 14 px across, 8 px down): the 80 px plate widened to 88 by stretching its middle 52 px to 60; the corners and the sides are the signed pixels.
python3 -I tools/createpieces.py -> slices/chamber-*.png, slices/plate-name-88x24.png, marks/create-pieces-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/lightfit.py").read(), globals())
def gblur(a_, sg):
    fy = np.fft.fftfreq(a_.shape[0])[:, None]; fx = np.fft.rfftfreq(a_.shape[1])[None, :]; return np.fft.irfft2(np.fft.rfft2(a_) * np.exp(-2 * (np.pi * sg) ** 2 * (fx ** 2 + fy ** 2)), a_.shape)
rng = np.random.default_rng(13); W, H = 400, 320; Yg, Xg = np.mgrid[0:H, 0:W].astype(float)
base = np.asarray(Image.open("slices/base-336x96.png").convert("RGBA")).astype(float); stage = np.asarray(Image.open("slices/room-bench-stage-incubator.png").convert("RGB")).astype(float)
SAND = base[50:70, 20:100, :3].reshape(-1, 3).mean(0); FOAM = stage[150:350, 200:700].reshape(-1, 3).mean(0)
def sup(f):
    im = Image.new("L", (W * 4, H * 4), 0); f(ImageDraw.Draw(im)); return np.asarray(im.resize((W, H), Image.LANCZOS)).astype(float) / 255.0
body = sup(lambda d: d.rounded_rectangle([0, 0, W * 4 - 1, H * 4 - 1], radius=4 * 10, fill=255))
inner = sup(lambda d: d.rounded_rectangle([4 * 12, 4 * 12, 4 * 388 - 1, 4 * 304 - 1], radius=4 * 4, fill=255))
grain = rng.standard_normal((H, W)) * 1.4; low = gblur(rng.standard_normal((H, W)), 5.0) * 26.0
# the rim and the floor: sand enamel, a little darker toward the foot, a soft unevenness and a fine grain
enamel = SAND[None, None] * (1 - 0.06 * (Yg / H))[..., None] + (low + grain)[..., None] * np.array([1.0, 1.0, 0.85])
# the panel: the stage's foam, a little lighter at the upper left (the device's warm daylight), a shadow just inside the rim (matte depth)
pan = FOAM[None, None] * (1 + 0.10 * np.clip(1 - (Xg / 400.0 + Yg / 320.0), 0, 1))[..., None] + (gblur(rng.standard_normal((H, W)), 0.7) * 3.0 + low * 0.25)[..., None]
dist_in = np.asarray(Image.fromarray((inner * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(float) / 255.0
pan = pan * (1 - 0.22 * (1 - dist_in)[..., None] * (inner[..., None] > 0.5))
rgb = enamel * (1 - inner[..., None]) + pan * inner[..., None]
# the stage's rendering (the art director's verdict on pass 113: the tray read as a flat UI box): light from the upper left: the rim lit along its top and left, shaded along its bottom and right (matte, no shine), a soft inner shadow under the rim falling onto the panel, four screws at the rim's corners
rimm = body * (1 - inner)
dgl = (Xg / W + Yg / H) / 2.0; rgb = rgb * (1 + (0.09 - 0.20 * dgl) * rimm)[..., None] + 0.0
def _sh(m, dx, dy): return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).transform((W, H), Image.AFFINE, (1, 0, dx, 0, 1, dy))).astype(float) / 255.0
litr = np.clip(body - _sh(body, 3, 3), 0, 1); darkr = np.clip(body - _sh(body, -3, -3), 0, 1); rgb = rgb * (1 + 0.10 * litr[..., None]) * (1 - 0.16 * darkr[..., None])
inl = np.clip(inner - _sh(inner, 3, 3), 0, 1); ind = np.clip(inner - _sh(inner, -3, -3), 0, 1); rgb = rgb * (1 - 0.10 * inl[..., None]) * (1 + 0.04 * ind[..., None])          # the panel's edge: the rim's inner lip lit at the lower right, shaded at the upper left
cast = np.asarray(Image.fromarray((_sh(inner, 5, 6) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(float) / 255.0
under = np.clip(inner - cast, 0, 1)                                                                                                                                  # the rim's shadow on the panel: strongest under the top and left rim
rgb = rgb * (1 - 0.42 * under[..., None])
for (sx, sy) in ((6, 6), (393, 6), (6, 296), (393, 296)):
    rr = np.hypot(Xg - sx, Yg - sy); ring = np.clip(1 - np.abs(rr - 2.8) / 0.9, 0, 1) * (rr < 3.8); slot = np.clip(1 - np.abs((Xg - sx) * 0.7 + (Yg - sy) * 0.7) / 0.7, 0, 1) * (rr < 2.2)
    rgb = rgb * (1 - 0.6 * ring[..., None]) + SAND * 0.55 * 0.6 * ring[..., None]; rgb = rgb * (1 - 0.3 * slot[..., None])
hair = SAND * 0.74; edge_o = np.clip(body - np.asarray(Image.fromarray((body * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(float) / 255.0, 0, 1)
edge_i = np.clip(np.asarray(Image.fromarray((inner * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))).astype(float) / 255.0 - inner, 0, 1)
rgb = rgb * (1 - 0.7 * edge_o[..., None]) + hair * 0.7 * edge_o[..., None]; rgb = rgb * (1 - 0.7 * edge_i[..., None]) + hair * 0.7 * edge_i[..., None]
# the floor: 400 x 16 at (0, 304): top face rows 304 to 310, a one-pixel bevel line at 311 (darker), the front face rows 312 to 319 (a little darker); matte
fl = np.zeros((H, W)); fl[304:, :] = 1
top = (Yg >= 304) & (Yg < 311); bev = (Yg >= 311) & (Yg < 312); frontf = (Yg >= 312)
rgb = np.where(top[..., None], SAND * 1.03 + (grain * 0.8)[..., None], rgb); rgb = np.where(bev[..., None], SAND * 0.80, rgb); rgb = np.where(frontf[..., None], SAND * 0.93 + (low * 0.4 + grain * 0.8)[..., None], rgb)
back_a = body * 255; back = Image.fromarray(np.dstack([rgb.clip(0, 255), back_a]).astype(np.uint8), "RGBA")
fa = np.zeros((H, W)); fa[310:, :] = 1; fa = fa * body; fa = np.asarray(Image.fromarray((fa * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.0))).astype(float)
front = Image.fromarray(np.dstack([rgb.clip(0, 255), fa]).astype(np.uint8), "RGBA")
back, brep = fit_light(back); print("chamber-back", brep)
man = json.load(open("slices/manifest.json")); outs = {}
def save(n, t, made, src):
    t.save(f"slices/{n}.png", optimize=True); outs[n] = t; man[n] = {"size": list(t.size), "rect": None, "src": src, "made": made + " (pass 113)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
bk = np.asarray(back).astype(float); fr = np.asarray(front).astype(float); fr[..., :3] = bk[..., :3]; front = Image.fromarray(fr.astype(np.uint8), "RGBA")
save("chamber-back-400x320", back, "the work tray in the housing, drawn by hand: a panel back (the Incubator stage's warm foam), an enamel rim (the sand of base-336x96), the floor 400x16 at (0, 304) in enamel with a bevel edge; matte, no glass edge, no highlight", "hand-drawn in tools/createpieces.py from room-bench-stage-incubator and base-336x96")
save("chamber-front-400x320", front, "the work tray's front: the rim only, over the founder's feet: the floor's front lip (rows 310 to 319), a transparent layer", "hand-drawn in tools/createpieces.py from room-bench-stage-incubator and base-336x96")
# plate-name-88x24: the signed 80 px plate, its middle 52 px stretched to 60
p80 = Image.open("slices/plate-name-80x24.png").convert("RGBA"); mid = p80.crop((14, 0, 66, 24)).resize((60, 24), Image.BICUBIC)
p88 = Image.new("RGBA", (88, 24)); p88.paste(p80.crop((0, 0, 14, 24)), (0, 0)); p88.paste(mid, (14, 0)); p88.paste(p80.crop((66, 0, 80, 24)), (74, 0))
save("plate-name-88x24", p88, "the small plate for the trait line's tag, cut from the signed plate-name 9-slice (insets 14 px across, 8 px down): the 80 px plate widened to 88, its middle 52 px stretched to 60", "slices/plate-name-80x24.png (signed 9-slice)")
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# proof: the tray on the Incubator stage (the Create stage is not painted yet), the founder as a placeholder, the plate beside
P = Image.open("slices/room-bench-stage-incubator.png").convert("RGBA"); P.alpha_composite(back, (312, 192))
fo = Image.new("RGBA", (304, 290), (0, 0, 0, 0)); ImageDraw.Draw(fo).rounded_rectangle([40, 30, 264, 288], radius=70, fill=(190, 150, 110, 255)); P.alpha_composite(fo, (360, 14 + 192))
P.alpha_composite(front, (312, 192)); P.alpha_composite(p88, (360, 150)); P.convert("RGB").save("marks/create-pieces-proof-1x.png"); print("ok")

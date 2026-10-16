"""T-20261016-41 (specs/station-create-bench-spec.md §3, §7): the drums' close-ups, look-{species}-{trait}-{look}-64x64, for the species with
signed paintings first (S01, S03), and the founder's per-look layers where a trait can be isolated as a part. By hand in code, no paid call.
- The close-ups follow the signed look plates' recipe (tools/guideplates2.py, pass 79) at 64: from the signed trait picture
  trait-{species}-{trait}-{look}-128x160, the centred 96 x 96 square of its 96 x 120 content box (16, 32, 112, 128), reduced to 60 (never
  enlarged), on `ground`, a superellipse mask fading into `ground` over 3 px (so no straight cut edge). The names follow Pods' crop scheme
  (prototypes/station/src/views/pods-props.mjs: slug of the trait's name and of the look). A doing (one plate per trait, "breed to change")
  gets look-{species}-{trait}-64x64, as Pods names its plate.
- Every shapeable trait's looks are taken from the species' frame (prototypes/workbench/frames/species-{S}.json); a look with no signed
  picture is listed as owed (an empty slot draws nothing).
- Founder layers: S01's crown only. Its looks are the bare head (the body itself: floor/S01/keys/mibi-adult-S01-base-stand-304x312) and the
  leaf crest (the part only: floor/S01/overlays/mibi-adult-S01-stand-crest-304x312, "base + overlay equals the base outside mask and band,
  0 differing pixels"). Copied 1:1 as founder-S01-base-304x312 and founder-S01-crown-leaf-crest-304x312.
usage: python3 -I create-bench/make-looks-64.py SLICES_DIR FRAMES_DIR OUT_DIR"""
import sys, os, re, json, shutil, numpy as np
from PIL import Image
sl, frames, out = sys.argv[1:4]
pal = dict(json.load(open(os.path.join(sl, "../../../../prototypes/ui/palettes/station.json")))["colours"])
GROUND = np.array([int(pal["ground"][i:i + 2], 16) for i in (1, 3, 5)], float)
slug = lambda x: re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", str(x).lower()))
def mask(w, h, cx, cy, rx, ry, f, n=2.4):
    y, x = np.mgrid[0:h, 0:w] + 0.5; s = (np.abs((x - cx) / rx) ** n + np.abs((y - cy) / ry) ** n) ** (1 / n); d = (1 - s) * min(rx, ry)
    t = np.clip(d / f, 0, 1); return t * t * (3 - 2 * t)
def closeup(src, dst):
    im = Image.open(src).convert("RGB").crop((16, 32, 112, 128)).resize((60, 60), Image.LANCZOS)
    a = np.asarray(im).astype(float); m = mask(60, 60, 30, 30, 30, 30, 3.0)[..., None]
    o = np.tile(GROUND, (64, 64, 1)); o[2:62, 2:62] = GROUND + (a - GROUND) * m
    Image.fromarray(np.clip(np.rint(o), 0, 255).astype(np.uint8)).save(dst)
made, owed = [], []
for sp in ("S01", "S03"):
    f = json.load(open(os.path.join(frames, f"species-{sp}.json")))
    for ch in f["chapters"]:
        for t in ch.get("traits", []):
            name = slug(t["name"])
            if t.get("nature") == "doing" or not t.get("shapeable"):
                src = os.path.join(sl, f"trait-{sp}-{name}-128x160.png"); dst = f"look-{sp}-{name}-64x64"
                if t.get("nature") == "doing":
                    (closeup(src, os.path.join(out, dst + ".png")), made.append(dst)) if os.path.exists(src) else owed.append(f"{dst} (no trait-{sp}-{name}-128x160)")
                continue
            for look in t.get("looks", []):
                src = os.path.join(sl, f"trait-{sp}-{name}-{slug(look)}-128x160.png"); dst = f"look-{sp}-{name}-{slug(look)}-64x64"
                if os.path.exists(src): closeup(src, os.path.join(out, dst + ".png")); made.append(dst)
                else: owed.append(f"{dst} (no signed trait-{sp}-{name}-{slug(look)}-128x160)")
fl = os.path.join(sl, "../floor/S01")
shutil.copyfile(os.path.join(fl, "keys/mibi-adult-S01-base-stand-304x312.png"), os.path.join(out, "founder-S01-base-304x312.png"))
shutil.copyfile(os.path.join(fl, "overlays/mibi-adult-S01-stand-crest-304x312.png"), os.path.join(out, "founder-S01-crown-leaf-crest-304x312.png"))
made += ["founder-S01-base-304x312", "founder-S01-crown-leaf-crest-304x312"]
json.dump({"made": made, "owed": owed}, open(os.path.join(out, "looks-64.json"), "w"), indent=1)
print(len(made), "made;", len(owed), "owed"); print("\n".join(owed))

"""Vivarium rooms, composite method: the 0 MXN hand pass on the piece sheets (tools/roompieces.py). Cut to straight alpha, sized, graded to the room's light,
placed by hand 1:1, and composited for the proof. Nothing here is placed into the game.
  key      magenta sheets: key and its shadows are pixels with r ~ b and g well under both; koi sheet: g well over r and b. Hard edge (binary alpha, 1 px eroded,
           despilled), straight alpha; bed: the shipped home-bed alpha shape (192x56, soft) times the cut; water (drops, trickle): alpha from the
           pixel's distance to the key, colour neutralised to its own luminance.
  grade    each piece to the light measured around its seat in the room's own painting (mean L and a half-way white balance), then the piece's shading:
           occluders a contact darkening at the foot; fittings partly in shade (ad-rooms-showpiece.md §2); koi mixed into the pond's water colour.
  behind   fittings that sit behind planting keep the painting's own foliage pixels over their top or bottom part (Ferns' copper lines).
python3 -I tools/roomcut.py [LIGHT] -> rooms/pieces/<room>/<id>-<light>.png, rooms/composite-idle-<room>-<light>.png, rooms/pieces/pieces.json
LIGHT defaults to day; other lights grade the same cuts against rooms/signed-idle-<room>-<light>.png."""
import os, sys, json, hashlib
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
LIGHT = sys.argv[1] if len(sys.argv) > 1 else "day"
def keymask(a, kind):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if kind == "g": return (g - np.maximum(r, b)) > 0.35 * g + 8
    mn = np.minimum(r, b); return ((mn - g) > 0.35 * mn + 8) & (np.abs(r - b) < 0.35 * np.maximum(r, b) + 20)
def cut(sheet, box, kind="m", water=False, erode=1):
    a = np.asarray(Image.open(f"source/raw/{sheet}.jpg").convert("RGB")).astype(float)[box[1]:box[3], box[0]:box[2]]
    if water:   # translucent water: alpha from the distance to the key colour, colour neutral
        kc = np.array([255, 0, 255.]); d = np.sqrt(((a - kc) ** 2).sum(2)) / 300; al = np.clip((d - 0.12) / 0.6, 0, 1)
        lum = a @ np.array([0.30, 0.40, 0.30]) if kind == "m" else a.mean(2); lum = np.clip(lum * 1.1 + 40, 0, 255)
        col = np.dstack([lum * 0.96, lum, lum * 1.03]); return np.dstack([col, al * 255])
    fg = ~keymask(a, kind); fg = ndimage.binary_opening(fg, iterations=1)
    lab, k = ndimage.label(fg); sizes = ndimage.sum(fg, lab, range(1, k + 1)); keep = np.isin(lab, 1 + np.where(sizes >= max(sizes) * 0.02)[0])
    keep = ndimage.binary_fill_holes(keep) if kind == "g" else keep
    keep = ndimage.binary_erosion(keep, iterations=erode)     # soft fuzzy moss edges on magenta keep a pink rim at 1 px: such pieces erode 3
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if kind == "m": ex = np.clip(np.minimum(r, b) - g, 0, None); a[..., 0] -= ex; a[..., 2] -= ex      # despill: no pixel keeps a magenta cast
    else: a[..., 1] = np.minimum(g, np.maximum(r, b) + 4)                                                 # despill green
    inner = ndimage.binary_erosion(keep, iterations=1 + 2 * erode)                                                      # the edge ring takes its colour from the nearest inner pixel:
    if inner.any():                                                                                          # no key-tinted or despilled-grey fringe survives the cut
        _, (iy, ix) = ndimage.distance_transform_edt(~inner, return_indices=True); ring = keep & ~inner; a[ring] = a[iy[ring], ix[ring]]
    return np.dstack([a.clip(0, 255), keep * 255.0])
def trim(p):
    al = p[..., 3] > 0; ys, xs = np.where(al); return p[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
def resize(p, w, h, hard=True):
    """Premultiplied Lanczos to w x h; hard pieces re-binarised at alpha 0.5 (hard edge, no halo)."""
    on = p[..., 3] > 127; col = p[..., :3].copy()
    if on.any() and not on.all():                                                     # colour bled outward over the empty ground first, so the resize has no
        _, (iy, ix) = ndimage.distance_transform_edt(~on, return_indices=True); col = col[iy, ix]   # key colour to mix in and no division at the edge (no halo)
    col = np.asarray(Image.fromarray(col.clip(0, 255).astype(np.uint8)).resize((w, h), Image.BOX if p.shape[1] > 2 * w else Image.LANCZOS)).astype(float)
    a2 = np.asarray(Image.fromarray(p[..., 3].clip(0, 255).astype(np.uint8)).resize((w, h), Image.BOX if p.shape[1] > 2 * w else Image.LANCZOS)).astype(float)[..., None] / 255
    if hard: a2 = (a2 >= HARD_AT).astype(float)
    return np.dstack([col.clip(0, 255), a2 * 255])
HARD_AT = 0.5
def fit(p, W, H, hard=True):
    p = trim(p); h, w = p.shape[:2]; s = min(W / w, H / h); return resize(p, max(1, round(w * s)), max(1, round(h * s)), hard)
def lum(a): return a[..., :3] @ np.array([0.2126, 0.7152, 0.0722])
def grade(p, scene, seat, gain=1.0, wb=0.5):
    """Match the piece's mean luminance to the painting's around the seat (times gain) and move its white balance half-way to the seat's."""
    x, y, w, h = seat; s = scene[max(0, y):min(y + h, 551), max(0, x):x + w].reshape(-1, 3); m = p[..., 3] > 0; c = p[..., :3][m]     # the seat never includes the foot strip
    sm, cm = s.mean(0), c.mean(0); bal = (sm / sm.mean()) / (cm / cm.mean()); q = p.copy()
    q[..., :3] = q[..., :3] * (1 + wb * (bal - 1)); q[..., :3] *= gain * lum(s).mean() / max(lum(q[..., :3][m]).mean(), 1); q[..., :3] = q[..., :3].clip(0, 255); return q
def mistgrade(q, scene, seat, white=0.62):
    """Mist is lighter than what it lies over, tinted by the seat's light: white times the seat's balance, mixed with the seat's mean."""
    x, y, w, h = seat; sm = scene[max(0, y):min(y + h, 551), max(0, x):x + w].reshape(-1, 3).mean(0); tint = sm / sm.max()
    q = q.copy(); q[..., :3] = white * 255 * (0.75 + 0.25 * tint) + (1 - white) * sm; return q
def shade(p, top, bottom):
    h = p.shape[0]; f = np.linspace(top, bottom, h)[:, None, None]; q = p.copy(); q[..., :3] = (q[..., :3] * f).clip(0, 255); return q
def rotate(p, deg, pivot):
    im = Image.fromarray(p.astype(np.uint8), "RGBA"); return np.asarray(im.rotate(deg, resample=Image.BICUBIC, center=pivot, expand=False)).astype(float)
def over(dst, p, x, y, behind=None):
    h, w = p.shape[:2]; reg = dst[y:y + h, x:x + w]; al = p[..., 3:] / 255
    if behind is not None: al = al * (1 - behind[..., None])
    dst[y:y + h, x:x + w] = reg * (1 - al) + p[..., :3] * al
def foliage(scene, x, y, w, h, rows):
    """1 where the painting's own frond pixels lie over the given rows of the piece's rect (the piece passes behind them)."""
    s = scene[y:y + h, x:x + w]; g = (s[..., 1] > s[..., 0] + 14) & (s[..., 1] > s[..., 2] + 14) & (lum(s) > 70)
    m = np.zeros((h, w)); m[rows[0]:rows[1]] = g[rows[0]:rows[1]]; return ndimage.binary_closing(m, iterations=1).astype(float)
def contact(dst, x, foot, w, depth=0.30):
    """The contact shadow is painted into the seat (the painting), never onto the piece: a soft ellipse under the foot."""
    h = max(4, w // 8); yy, xx = np.mgrid[-h:h + 1, -w // 2 - 4:w // 2 + 5]; e = np.clip(1 - (xx / (w / 2 + 4)) ** 2 - (yy / h) ** 2, 0, 1) ** 0.8
    y0 = foot - h + 1; x0 = x - 4; reg = dst[y0:y0 + e.shape[0], x0:x0 + e.shape[1]]; e = e[:reg.shape[0], :reg.shape[1]]; reg *= (1 - depth * e)[..., None]
def save(p, path): Image.fromarray(p.round().clip(0, 255).astype(np.uint8), "RGBA").save(path)
def keepout(x, foot, w): return [x + 6, foot - 15, w - 12, 18]
# ---- the pieces: sheet box (from the 1376x768 sheet), size box, placement (x, foot row) in painting coordinates (1024x568), measured by hand at 1x ----
ROOMS = {
 "roots": {"sheet": "pieces-roots-b", "pieces": [      # the bluebell room (round u): sheet b's occluders and mister; sheet a's bed cut regraded to the new look (wb 0.85)
   {"id": "roots-sorrel-1", "kind": "occluder", "level": "main", "box": (140, 95, 662, 352), "fit": (96, 48), "x": 118, "foot": 541, "hard_at": 0.4, "erode": 4, "what": "low moss-and-wood-sorrel tuft, leafy, no flowers"},
   {"id": "roots-stone-2", "kind": "occluder", "level": "main", "box": (835, 108, 1206, 336), "fit": (68, 42), "x": 684, "foot": 539, "gain_night": 0.98, "what": "small rounded silver-grey stone, moss cap; clear of the bed's keepOut (x 752) and the away corner (x 668)"},
   {"id": "roots-bed", "kind": "bed", "level": "main", "sheet": "pieces-roots-a", "box": (435, 314, 1001, 492), "fit": (192, 56), "x": 792, "foot": 551, "wb": 0.85, "what": "the sleeping nest (pieces-roots-a's cut) regraded to the bluebell room; the shipped home-bed shape and seat [792,496,192,56]"},
   {"id": "roots-mister", "kind": "fitting", "level": None, "box": (150, 455, 490, 692), "fit": (50, 35), "x": 920, "foot": 356, "flip": True, "what": "a small pewter-grey line ending in a dull brass nozzle, wrapped by a root and a moss sprig, lying in the back moss mound at the right under the bluebells, resting on the moss, pointing left; its spray is a mist wisp (ambient)", "shade": (0.85, 0.62)}]},
 "reeds": {"sheet": "pieces-reeds-a", "pieces": [
   {"id": "reeds-sedge-2", "kind": "occluder", "level": "main", "box": (93, 73, 755, 564), "fit": (96, 48), "x": 214, "foot": 543, "hard_at": 0.3, "what": "low sedge tuft beaded with rain, leafy"},
   {"id": "reeds-stone-1", "kind": "occluder", "level": "main", "box": (855, 90, 1265, 353), "fit": (78, 48), "x": 770, "foot": 541, "what": "small wet rounded stone, moss at its base"},
   {"id": "reeds-raincup", "kind": "fitting", "level": None, "box": (770, 430, 1018, 726), "fit": (30, 36), "x": 918, "foot": 338, "what": "a small dark ceramic rain cup on a bamboo stake, in the right sedges at the bank's back edge; drips (ambient)", "shade": (0.85, 0.6)},
   {"id": "reeds-drop", "kind": "drop", "level": None, "box": (1118, 478, 1249, 657), "fit": (4, 7), "x": 944, "foot": 315, "what": "the drop cell: falls from the cup's lip (x 944, y 309) to the bank's moss at y 340, every ~4 s"}]},
 "boulders": {"sheet": "pieces-boulders-a", "pieces": [
   {"id": "boulders-stone-2", "kind": "occluder", "level": "main", "box": (54, 84, 486, 300), "fit": (80, 46), "x": 150, "foot": 541, "what": "low moss-capped granite stone"},
   {"id": "boulders-cushion-1", "kind": "occluder", "level": "main", "box": (548, 83, 1007, 340), "fit": (82, 46), "x": 846, "foot": 541, "what": "low clipped moss-and-fern cushion, two gold leaves"},
   {"id": "boulders-lantern", "kind": "fitting", "level": None, "box": (1049, 23, 1314, 345), "fit": (34, 44), "x": 940, "foot": 372, "what": "small stone lantern (toro), unlit, at the back right on the island's far slope", "shade": (0.8, 0.58)},
   {"id": "boulders-shishi", "kind": "fitting", "level": None, "box": (115, 386, 478, 700), "fit": (64, 58), "x": 166, "foot": 317, "what": "shishi-odoshi base: flume, post, stone basin, the pivot posts; at the back of the terrace among the shrubs; the one moving fitting", "shade": (0.9, 0.7)},
   {"id": "boulders-arm", "kind": "anim", "level": None, "box": (571, 494, 996, 640), "what": "the bamboo arm, 4 poses (fill, tip, empty, knock back), rigid rotation about the pivot, every ~50 s"},
   {"id": "boulders-trickle", "kind": "drop", "level": None, "box": (1153, 426, 1191, 511), "fit": (2, 9), "x": 0, "foot": 0, "what": "the flume's trickle cell"}]},
 "ferns": {"sheet": "pieces-ferns-a", "pieces": [
   {"id": "ferns-fern-1", "kind": "occluder", "level": "main", "box": (97, 41, 527, 339), "fit": (72, 48), "x": 30, "foot": 543, "what": "low fern tuft, leafy"},
   {"id": "ferns-crozier-1", "kind": "occluder", "level": "main", "box": (921, 53, 1286, 319), "fit": (68, 46), "x": 818, "foot": 541, "what": "small crozier clump, curled heads low"},
   {"id": "ferns-fogger", "kind": "fitting", "level": None, "box": (548, 330, 863, 525), "fit": (46, 30), "x": 556, "foot": 360, "gain": 0.8, "what": "the fogger bowl in the hollow right of the croziers at the back edge; its fog is the mist wisps (ambient)", "shade": (0.82, 0.6)},
   {"id": "ferns-copper-1", "kind": "fitting", "level": None, "box": (248, 382, 279, 734), "fit": (4, 78), "x": 836, "foot": 290, "gain": 1.3, "what": "thin copper drip line among the right fronds, its top behind the fronds", "shade": (0.95, 0.8), "behind": (0, 34)},
   {"id": "ferns-copper-2", "kind": "fitting", "level": None, "box": (325, 382, 371, 622), "fit": (6, 52), "x": 884, "foot": 262, "gain": 1.3, "what": "second thin copper drip line, shorter", "shade": (0.95, 0.8), "behind": (0, 24)},
   {"id": "ferns-drop", "kind": "drop", "level": None, "box": (1040, 484, 1173, 666), "fit": (4, 6), "x": 0, "foot": 0, "what": "the drop cell: from each line's tip to the shelf's moss, every ~8 s"}]},
}
KOI = {"sheet": "pieces-koi-a", "rows": [[(48, 63, 350, 178), (399, 47, 654, 193), (707, 62, 1008, 178), (1073, 48, 1318, 191)], [(48, 239, 350, 355), (410, 211, 654, 382), (707, 238, 1008, 354), (1070, 225, 1314, 370)],
       [(48, 416, 350, 531), (410, 389, 654, 559), (708, 416, 1008, 531), (1071, 402, 1314, 546)], [(48, 592, 350, 708), (410, 565, 654, 738), (706, 592, 1009, 708), (1070, 578, 1315, 724)]],
       "names": ["kohaku", "ogon", "tancho", "chagoi"], "len": 26, "squash": 0.45, "pond": [345, 332, 205, 34]}
# the shishi-odoshi arm: length and pivot in painting coordinates (the pivot sits between the two pivot posts of the base); open end left, under the flume's spout
ARM = {"len": 30, "thick": 6, "pivot": (216, 288), "poses": {"fill": -16, "tip": 4, "empty": 26, "knock": -20}, "open_from_pivot": 19}
MIST = {"roots": [{"wisp": 2, "rect": [850, 324, 80, 18], "alpha": 0.6, "what": "the mister's spray, drifting left from the nozzle and fading"}],
        "ferns": [{"wisp": 1, "rect": [530, 312, 104, 26], "alpha": 0.7, "what": "fog brimming from the bowl"}, {"wisp": 4, "rect": [600, 338, 150, 24], "alpha": 0.45, "what": "fog drifting right along the back edge, never below row 362"}]}
def wisp(i, w, h, alpha):
    im = Image.open(f"rooms/mist/mist-wisp-{i}.png").convert("RGBA").resize((w, h), Image.LANCZOS); q = np.asarray(im).astype(float); q[..., 3] *= alpha; return q
def scene_of(room): return np.asarray(Image.open(f"rooms/signed-idle-{room}-{LIGHT}.png").convert("RGB")).astype(float)
def run():
    global HARD_AT
    out = {"note": "Pieces by the composite method, cut and placed by hand at 0 MXN (tools/roomcut.py). Painting coordinates (1024x568); the whole's window y = painting y - 80. rect [x, y, w, h]; foot = the lowest row of the piece's ink; occluders are hard-edged straight alpha (ARGB8888); draw order by foot row with the walkers.", "light": LIGHT}
    for room, R in ROOMS.items():
        if not os.path.exists(f"rooms/signed-idle-{room}-{LIGHT}.png"): print("no", LIGHT, "scene for", room, "(skipped)"); continue
        os.makedirs(f"rooms/pieces/{room}", exist_ok=True); scene = scene_of(room); comp = scene.copy(); seated = scene.copy(); rec = []
        for pc in R["pieces"]:
            if pc["kind"] == "anim": continue
            water = pc["kind"] == "drop"; p = cut(pc.get("sheet", R["sheet"]), pc["box"], "m", water, pc.get("erode", 1))
            if pc["id"] == "boulders-trickle": p = fit(p, *pc["fit"], hard=False); save(p, f"rooms/pieces/{room}/{pc['id']}-{LIGHT}.png"); rec.append({"id": pc["id"], "kind": pc["kind"], "size": [p.shape[1], p.shape[0]], "what": pc["what"]}); continue
            HARD_AT = pc.get("hard_at", 0.5)                      # thin blades keep their width at 1x with a lower cut
            p = fit(p, *pc["fit"], hard=not water and pc["kind"] != "bed"); h, w = p.shape[:2]
            if pc.get("flip"): p = p[:, ::-1].copy()
            x = pc["x"]; y = pc["foot"] - h + 1
            if pc["kind"] == "bed":    # into the shipped 192x56 bed's frame and soft shape
                frame = np.zeros((56, 192, 4)); ox = (192 - w) // 2; frame[56 - h:, ox:ox + w] = p; ba = np.asarray(Image.open("slices/home-bed-day-192x56.png"))[..., 3] / 255.0
                cov = ndimage.gaussian_filter(ndimage.binary_erosion(frame[..., 3] > 127, iterations=3).astype(float), 2.0); frame[..., 3] = 255 * np.minimum(ba, cov)
                hole = frame[..., 3] < 1; frame[..., :3][hole] = 0; p = frame; h, w = 56, 192; y = 496
            if pc["kind"] == "drop":
                p = grade(p, scene, [pc["x"] - 20, pc["foot"] - 30, 40, 40], 1.25, 0.6)
                save(p, f"rooms/pieces/{room}/{pc['id']}-{LIGHT}.png"); rec.append({"id": pc["id"], "kind": "drop", "size": [w, h], "what": pc["what"]})
                if pc["x"]: over(comp, p, x, y)
                continue
            seat = [x - 24, y - 16, w + 48, h + 24] if pc["kind"] != "occluder" else [x - 40, y - 40, w + 80, h + 50]
            p = grade(p, scene, seat, pc.get("gain_" + LIGHT, pc.get("gain", 1.12 if pc["kind"] == "occluder" else 1.0)), pc.get("wb", 0.5))     # gain_<light>: one light's own gain
            p = shade(p, *(pc.get("shade") or ((1.06, 0.86) if pc["kind"] == "occluder" else (1.0, 1.0))))
            if pc["kind"] in ("occluder", "fitting") and not pc.get("behind"): contact(comp, x, pc["foot"], w); contact(seated, x, pc["foot"], w)
            beh = foliage(scene, x, y, w, h, pc["behind"]) if pc.get("behind") else None
            if beh is not None: p[..., 3] *= (1 - beh)      # the master itself carries the cut: the fronds' pixels stay the painting's
            save(p, f"rooms/pieces/{room}/{pc['id']}-{LIGHT}.png"); over(comp, p, x, y)
            r = {"id": pc["id"], "kind": pc["kind"], "level": pc["level"], "rect_painting": [x, y, w, h], "foot_painting": pc["foot"] if pc["kind"] != "bed" else 551, "file": f"rooms/pieces/{room}/{pc['id']}-{{light}}.png", "what": pc["what"]}
            if pc["kind"] == "occluder": r.update({"keepOut_painting": keepout(x, pc["foot"], w), "edge": "hard"})
            if pc["kind"] == "bed": r.update({"edge": "soft (the shipped home-bed alpha shape)", "keepOut_painting": [752, 436, 256, 116]})
            if pc["kind"] == "fitting": r.update({"edge": "hard", "share_of_window_pct": round(100 * w * h / (1024 * 440), 2)})
            rec.append(r)
        if room == "boulders":   # the arm's four poses about the pivot, and the koi under the pond's surface
            a = cut(R["sheet"], (571, 494, 996, 640)); a = trim(a); a = a[:, ::-1]                       # open (slanted) end to the left
            a = resize(a, ARM["len"], max(4, round(ARM["len"] * a.shape[0] / a.shape[1])), True); a = grade(a, scene, [150, 260, 90, 60], 0.9, 0.5); a = shade(a, 0.95, 0.72)
            cw = 48; px, py = ARM["pivot"]; poses = {}
            for nm, deg in ARM["poses"].items():
                cell = np.zeros((cw, cw, 4)); ah, aw = a.shape[:2]; ox = cw // 2 - ARM["open_from_pivot"] - 0; oy = cw // 2 - ah // 2
                cell[oy:oy + ah, max(0, ox):max(0, ox) + aw] = a[:, :min(aw, cw - max(0, ox))]
                cell = rotate(cell, deg, (cw // 2, cw // 2)); cell[..., 3] = (cell[..., 3] >= 128) * 255.0
                save(cell, f"rooms/pieces/boulders/boulders-arm-{nm}-{LIGHT}.png"); poses[nm] = deg
            arm_fill = np.asarray(Image.open(f"rooms/pieces/boulders/boulders-arm-fill-{LIGHT}.png")).astype(float); over(comp, arm_fill, px - cw // 2, py - cw // 2)
            tr = np.asarray(Image.open(f"rooms/pieces/boulders/boulders-trickle-{LIGHT}.png")).astype(float); over(comp, tr, 195, 282)
            rec.append({"id": "boulders-arm", "kind": "anim", "cell": [cw, cw], "pivot_painting": [px, py], "rect_painting": [px - cw // 2, py - cw // 2, cw, cw], "poses_deg": poses,
                        "cycle": "fill (hold ~45 s while the trickle falls into the open end) -> tip (300 ms) -> empty (hold 1.2 s, the basin glints) -> knock (200 ms, the knock) -> fill",
                        "file": "rooms/pieces/boulders/boulders-arm-{pose}-{light}.png", "what": "the bamboo arm on its pivot posts; open end under the flume's spout"})
            K = KOI; x0, y0, pw, ph = K["pond"]; pond = scene[y0:y0 + ph, x0:x0 + pw].reshape(-1, 3).mean(0); kc = []
            for ri, row in enumerate(K["rows"]):
                for ci, bx in enumerate(row):
                    k = cut(K["sheet"], bx, "g"); k = trim(k); h0, w0 = k.shape[:2]; s = K["len"] / max(w0, h0 * 1.6)
                    k = resize(k, max(1, round(w0 * s)), max(1, round(h0 * s * K["squash"])), True)
                    k[..., :3] = k[..., :3] * 0.62 + pond * 0.38                                         # just under the dark surface
                    cell = np.zeros((14, 30, 4)); kh, kw = k.shape[:2]; cell[(14 - kh) // 2:(14 - kh) // 2 + kh, (30 - kw) // 2:(30 - kw) // 2 + kw] = k[:14, :30]
                    save(cell, f"rooms/pieces/boulders/koi-{K['names'][ri]}-{ci + 1}-{LIGHT}.png")
                    if ci == 0: kc.append(cell)
            for i, (kx, ky, fl) in enumerate([(370, 338, False), (430, 350, True), (480, 337, False)]):
                c = kc[i][:, ::-1] if fl else kc[i]; over(comp, c, kx, ky)
            rec.append({"id": "boulders-koi", "kind": "anim", "cells": [30, 14], "fish": K["names"], "frames": 4, "file": "rooms/pieces/boulders/koi-{name}-{1..4}-{light}.png",
                        "mask_painting": K["pond"], "swim": "3 of the 4 visible at once; each swims the pond's long axis at ~6 px/s on a 4-cell cycle (one cell each 500 ms), flipped for leftward, turns at the rim with a 2 s hold; never outside the pond mask; drawn under the pond's surface (behind everything on the ground)",
                        "what": "koi just under the pond's dark surface, mixed 38 % into the water's colour"})
        for m in MIST.get(room, []):
            x, y, w, h = m["rect"]; q = wisp(m["wisp"], w, h, m["alpha"]); q = mistgrade(q, scene, [x, y - 20, w, h + 40]); over(comp, q, x, y)
            save(q, f"rooms/pieces/{room}/{room}-mist-{m['wisp']}-{LIGHT}.png")
            rec.append({"id": f"{room}-mist-{m['wisp']}", "kind": "mist", "wisp": f"rooms/mist/mist-wisp-{m['wisp']}.png", "rect_painting": m["rect"], "alpha": m["alpha"], "alpha_in_file": True, "what": m["what"]})
        Image.fromarray(seated.round().clip(0, 255).astype(np.uint8)).save(f"rooms/seated-idle-{room}-{LIGHT}.png")     # the painting the engine draws under the pieces: the signed scene plus the seats' contact shadows
        Image.fromarray(comp.round().clip(0, 255).astype(np.uint8)).save(f"rooms/composite-idle-{room}-{LIGHT}.png"); out[room] = rec
    json.dump(out, open(f"rooms/pieces/pieces-{LIGHT}.json", "w"), indent=1)     # rects and feet are the day's: every light is cut from the same sheet and placed 1:1 at the same rects; print("ok", LIGHT)
run()

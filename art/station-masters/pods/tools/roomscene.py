"""Vivarium rooms: scene paintings by the composite method (owner 18:41): the scene is painted WITHOUT fittings, occluders or animated pieces; those are painted
separately on a plain ground and placed by hand. Composition from ad-composition.md (form, focal point, levels, calm ground). Image 1 is the picked option tile.
python3 -I tools/roomscene.py ROOM LETTER -> rooms/pick-<room>-<sheet><opt>.png, source/work/rooms/idle-vivarium-<room>-day-<LETTER>.json"""
import os, sys, json, hashlib
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"; room, L = sys.argv[1], sys.argv[2]
PICK = {"boulders": ("b", "B", (688, 0), (12, 16, 666, 372))}
sh, opt, (ox, oy), (x0, y0, x1, y1) = PICK[room]; pick = f"rooms/pick-{room}-{sh}{opt}.png"
Image.open(f"source/raw/options-{room}-{sh}.jpg").convert("RGB").crop((ox + x0, oy + y0, ox + x1, oy + y1)).save(pick)
COMMON = ("Image 1 is the approved concept for this room. Paint THIS room as a finished painting with the same planting, palette, season, mood and light as Image 1, "
 "showing ONLY the inside of the terrarium, edge to edge, wide, from a low eye height, straight on: no case, no frame, no window posts, no glass edges, no box. "
 "Finish: a hand-painted miniature diorama, fine painterly grain on everything, the back softly out of focus with gentle bokeh, the ground sharp; never photographic, never toon, never childish, no cartoon outlines, no toy colours, no gloss, no glow. "
 "No creatures, no animals, no fish, no figures, no text, no letters, no digits, no UI. "
 "NO fittings or objects of any kind: no lantern, no bamboo, no pipes, no gates, no planters, no boxes, no blocks; and NO small pieces standing at the front of the ground: the front of the ground is plain. ")
SCENE = {"boulders": ("THE ROOM: a small shrine garden in autumn, a CONVEX composition. A mossy island rises at the right of centre; on it ONE small maple in warm amber and gold leaves (never bright red) and one large upright mossy hero stone at about 62 percent of the width, with two or three smaller mossy stones of the same kind leaning beside it. "
  "A small still dark pond lies set BACK at the left foot of the island, behind the ground, from about 34 to 56 percent of the width, its mossy stone rim low, its water dark and calm with a soft reflection of the maple; no fish; no shore runs forward onto the ground. "
  "LEVELS: the MAIN GROUND is calm moss in large soft patches with a little fine soil, low in contrast, a few gold leaves only at the island's foot; it runs across the full width from about 74 percent of the height down to about 97 percent; "
  "at the LEFT, from the left edge to about 28 percent of the width, a RAISED MOSS TERRACE whose flat walkable top runs from about 63 to 71 percent of the height, its front lip low and rounded, mossy, with soft shadow under it; "
  "a gentle mossy RAMP from about 28 to 38 percent of the width joins the terrace down to the main ground. Behind the terrace, low shrubs and ferns; behind everything soft autumn foliage in bokeh. "
  "The bottom 3 percent is a thin dark soil strip across the full width. Everything taller than the moss stands behind the ground's back edge, never on the open ground. Warm low light from the left.")}
n = f"idle-vivarium-{room}-day-{L}"; prompt = "Output a NEW image, 16:9. " + COMMON + SCENE[room]
refs = [[P + pick, f"IMAGE 1, THE APPROVED CONCEPT (option {sh}{opt}): the room's planting, palette, season, mood and light; never its frame, posts or the small blocks at its front:"]]
idx_p = "source/work/rooms/prompts.json"; idx = json.load(open(idx_p))
if n in idx and idx[n]["prompt"] != prompt: raise SystemExit(f"{n} already written with another prompt")
json.dump([{"name": n, "model": "gemini-3-pro-image", "aspect": "16:9", "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}], open(f"source/work/rooms/{n}.json", "w"), indent=1)
idx[n] = {"sha256": hashlib.sha256(prompt.encode()).hexdigest(), "prompt": prompt, "refs": refs}; json.dump(idx, open(idx_p, "w"), indent=1); print(n)

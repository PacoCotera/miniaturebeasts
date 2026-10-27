"""Vivarium rooms: scene paintings by the composite method (owner 18:41): the scene is painted WITHOUT fittings, occluders or animated pieces; those are painted
separately on a plain ground and placed by hand. Composition from ad-composition.md (form, focal point, levels, calm ground). Image 1 is the picked option tile.
python3 -I tools/roomscene.py ROOM LETTER -> rooms/pick-<room>-<sheet><opt>.png, source/work/rooms/idle-vivarium-<room>-day-<LETTER>.json"""
import os, sys, json, hashlib
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"; room, L = sys.argv[1], sys.argv[2]
PICK = {"boulders": ("b", "B", (688, 0), (12, 16, 666, 372)), "reeds": ("a", "B", (688, 0), (32, 26, 656, 356)), "ferns": ("a", "A", (0, 0), (84, 48, 600, 330)), "roots": ("a", "A", (0, 0), (24, 24, 676, 372))}
# Roots round u (owner's pick from option sheet b: A, "bluebells is lovely"): tile A of options-roots-b; the tile's second hollow (at its right) is cloned over
# with the moss below it at 0 MXN before the crop, so Image 1 shows one burrow only (the bed's seat must not be a second hollow).
ROOTS_B = room == "roots" and L.startswith("u")
if ROOTS_B: PICK["roots"] = ("b", "A", (0, 0), (6, 4, 684, 380))
sh, opt, (ox, oy), (x0, y0, x1, y1) = PICK[room]; pick = f"rooms/pick-{room}-{sh}{opt}.png"
src = Image.open(f"source/raw/options-{room}-{sh}.jpg").convert("RGB")
if ROOTS_B:
    import numpy as np
    a = np.asarray(src).astype(float); yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]; m = np.clip((1.25 - ((xx - 590) / 56.0) ** 2 - ((yy - 266) / 30.0) ** 2) / 0.5, 0, 1)[..., None]
    src = Image.fromarray((a * (1 - m) + np.roll(a, (-44, -30), axis=(0, 1)) * m).round().astype(np.uint8))
src.crop((ox + x0, oy + y0, ox + x1, oy + y1)).save(pick)
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
  "The bottom 3 percent is a thin dark soil strip across the full width. Everything taller than the moss stands behind the ground's back edge, never on the open ground. Warm low light from the left."),
 "reeds": ("THE ROOM: a sedge meadow just after rain, a CONCAVE composition: silver-green sedges beaded with raindrops stand tall at BOTH sides (the left quarter and the right quarter), lower towards the middle, around an OPEN CENTRE where a pale soft haze fills the back and gives depth. "
  "The focal point: one rain-darkened rounded rock, smooth and weathered, at about 38 percent of the width, its top at about 55 percent of the height, half among low sedges, sitting behind the ground's back edge. "
  "LEVELS: the MAIN GROUND is short wet moss in large soft patches, calm and low in contrast, with one darker strip of damp fine soil winding back from the front centre towards the rock like a path, narrowing as it goes; NO puddles, no water patches, no blue; "
  "it runs across the full width from about 72 percent of the height down to about 97 percent. At the RIGHT, from about 70 percent of the width to the right edge, a LOW MOSSY BANK, a raised level whose flat walkable top runs from about 62 to 70 percent of the height, its front lip soft and rounded, with sedges behind it; "
  "a gentle mossy slope from about 62 to 70 percent of the width joins the bank down to the main ground. The bottom 3 percent is a thin dark soil strip across the full width. "
  "Everything taller than the moss stands behind the ground's back edge or behind the bank, never on the open ground. Soft bright overcast light, cool grey-green above, a warm moss ground."),
 "ferns": ("THE ROOM: a shaded fern dell, a TRIANGULAR composition rising to the RIGHT: low ferns at the left, the fern bank climbing higher and denser to the right, deep green with golden flecks of sun, dappled green-gold light, cool shade. "
  "A mossy fallen log lies on the ground's back edge as a leading line, rising gently from the low left (about 12 percent of the width) up towards the right (about 64 percent), never crossing the open ground. "
  "The focal point: a cluster of curled croziers and lit young fronds at about 62 percent of the width, just behind the log's upper end; a shaded hollow behind the log at the right of centre with a faint low mist lying along the back. "
  "LEVELS: the MAIN GROUND is short bright moss with one darker strip of peat winding back from the front left towards the focal point, narrowing as it goes; calm, low in contrast, no leaves, nothing scattered on it; "
  "it runs across the full width from about 74 percent of the height down to about 97 percent. At the RIGHT, from about 72 percent of the width to the right edge, a RAISED MOSSY SHELF, a level whose flat walkable top runs from about 60 to 68 percent of the height, its front lip soft and rounded, with ferns behind it; "
  "a gentle mossy slope from about 64 to 72 percent of the width joins it down to the main ground. The bottom 3 percent is a thin dark soil strip. No tree trunks, no forest: it is a terrarium planting. No hanging lines, no bowls."),
 "roots": ("THE ROOM: an old root-and-burrow bank in warm golden late-morning light through a high soft canopy, a TRIANGULAR composition HIGH at the LEFT: the base of an old tree's roots, honey-brown and mossy, rises at the left (the trunk only a base, cut by the top of the picture), its roots spreading down and to the right behind the ground. "
  "The focal point: a dark round BURROW MOUTH in the mossy mound under the roots at about 28 percent of the width, its bottom at about 66 percent of the height. "
  "LEVELS: at the LEFT, from the left edge to about 24 percent of the width, a LOW MOSSY TERRACE (the mound's lower flank) whose flat walkable top runs from about 60 to 68 percent of the height, its front lip soft and rounded; a gentle mossy ramp from about 24 to 34 percent of the width joins it down to the main ground. "
  "The MAIN GROUND is calm moss and fine soil in large soft patches, with a faint lighter path of soil winding from the front right back to the burrow, low in contrast, NOTHING scattered on it (no pebbles, no twigs, no succulents, no mushrooms); it runs across the full width from about 72 percent of the height down to about 97 percent. "
  "At the lower right, from about 77 to 96 percent of the width and over the bottom tenth of the height, a soft calm mossy patch, flat and plain (a sleeping place; nothing in it, no pit, no hollow). "
  "The right side of the picture is low and open, soft green foliage in bokeh behind. The bottom 3 percent is a thin dark soil strip across the full width. Roots and everything taller than the moss stay behind the ground's back edge, never lying across the open ground.")}
if ROOTS_B: SCENE["roots"] = ("THE ROOM: a bluebell bank in spring, as in Image 1: an old silver-grey beech, only the base of its trunk and its roots in view, the trunk cut by the top of the picture; "
  "the tree is SMALLER than in Image 1, its trunk at the top of the picture about a seventh of the width, so the room reads at the scale of small creatures; a few fresh spring-green beech leaves hang from the top; "
  "soft bright morning light from the upper left; a pale silver, sage and blue-green bokeh behind; drifts of blue-violet bluebells ONLY in the back, behind the ground's back edge and on the mound behind the roots, soft and out of focus. "
  "A TRIANGULAR composition HIGH at the LEFT: the roots and a mossy mound rise at the left (the trunk's base from about 12 to 30 percent of the width), the roots spreading down and to the right behind the ground. "
  "The focal point: ONE dark round BURROW MOUTH in the mossy mound between the roots at about 28 percent of the width, its bottom at about 64 percent of the height, about an eighth of the picture's height tall. "
  "There is only this ONE burrow: no second hollow, hole, cave, den or burrow anywhere else in the picture. "
  "LEVELS: at the LEFT, from the left edge to about 23 percent of the width, a LOW MOSSY TERRACE (the mound's lower flank) whose flat walkable top runs from about 54 to 62 percent of the height, its front lip soft and rounded; a gentle mossy ramp from about 23 to 36 percent of the width joins it down to the main ground. "
  "The MAIN GROUND is calm fresh moss and fine soil in large soft patches, with a faint lighter path of soil winding from the front right back to the burrow, low in contrast, NOTHING on it: NO flowers, no bluebells, no petals, no pebbles, no twigs, no mushrooms; "
  "no flower stands anywhere in front of the ground's back edge or at the front of the picture (unlike Image 1's front left); it runs across the full width from about 64 percent of the height down to about 97 percent. "
  "At the lower right, from about 77 to 96 percent of the width and over the bottom tenth of the height, a soft calm mossy patch, flat and plain (a sleeping place; nothing in it, no pit, no hollow). "
  "The right side of the picture is low and open, soft spring-green foliage and bluebell haze in bokeh behind. The bottom 3 percent is a thin dark soil strip across the full width. "
  "Roots and everything taller than the moss stay behind the ground's back edge, never lying across the open ground. Never gold, amber, honey or orange light; never gloomy or dark.")
n = f"idle-vivarium-{room}-day-{L}"; prompt = "Output a NEW image, 16:9. " + COMMON + SCENE[room]
refs = [[P + pick, f"IMAGE 1, THE APPROVED CONCEPT (option {sh}{opt}): the room's planting, palette, season, mood and light; never its frame, posts or the small blocks at its front:"]]
# Roots ub: a Pro edit of ua (art director's 1x read: ua's terrace ends in a bare earth face about 80-100 px tall with no ramp; everything else holds), "keep everything, change only".
if ROOTS_B and L == "ub":
    prompt = ("Output a NEW image, 16:9: Image 1 edited. KEEP EVERYTHING in Image 1 exactly as it is (the beech, its roots, the burrow, the bluebells, the leaves, the soil path, the moss patches, the plain mossy patch at the lower right, "
     "the palette, the light, the hand-painted miniature finish, the soft back, the camera) and CHANGE ONLY the raised mossy terrace at the left: keep its flat mossy top where it is (from the left edge to about 24 percent of the width, at about 52 to 57 percent of the height), "
     "and replace the bare brown earth faces under it with moss: its front lip becomes LOW, soft and ROUNDED, mossy, with a soft shadow under it, never a wall; and from about 16 to 34 percent of the width a broad, GENTLE mossy RAMP slopes smoothly down from the terrace's top "
     "to the main ground in front of the burrow, reaching the ground at about 70 percent of the height, moss all over, no earth wall, no step, no ledge. The burrow mouth stays exactly as it is, open and dark. "
     "Do not add anything else; no flowers on the ground, no second hollow, no creatures, no text, no frame, no box.")
    refs = [[P + "rooms/work-idle-vivarium-roots-day-ua.png", "IMAGE 1, THE PICTURE TO EDIT (this room's day, round ua): keep everything but the listed change:"]]
idx_p = "source/work/rooms/prompts.json"; idx = json.load(open(idx_p))
if n in idx and idx[n]["prompt"] != prompt: raise SystemExit(f"{n} already written with another prompt")
json.dump([{"name": n, "model": "gemini-3-pro-image", "aspect": "16:9", "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}], open(f"source/work/rooms/{n}.json", "w"), indent=1)
idx[n] = {"sha256": hashlib.sha256(prompt.encode()).hexdigest(), "prompt": prompt, "refs": refs}; json.dump(idx, open(idx_p, "w"), indent=1); print(n)

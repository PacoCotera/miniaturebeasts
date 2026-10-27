"""Vivarium rooms 2-4, the studio's job files (art director's briefs ad-rooms-briefs.md §3, owner's go 2026-10-26).
Writes source/work/rooms/<name>.json (one request each, tries 1 written in every job, since gen.py's default is 2: a failed or refused request stops the job, no retry) and
source/work/rooms/prompts.json (every prompt with its sha256; entries already there are kept, never rewritten). Model and size as room 1's pass 94: gemini-3-pro-image, 1K.
Re-brief for round 1b (lead's approval, 2026-10-26): the map in two greys, "a diagram; nothing of it is painted"; Image 1 names its floor dressing as absent;
the floor sunlit as brightly as Image 1's; the tall pieces' feet end at the back edge, nothing on the floor larger than a small pebble but two fist-sized pieces.
The day compositions are written as round DAY (b); the a jobs of round 1 stay as committed (e4fd58d7).
python3 -I tools/roomjobs.py"""
import os, json, hashlib
DAY = "b"; NEAR_DAY = "a"   # Idle day: round 1b; near day: round 2 (never sent before, so its a jobs are rewritten with the grey map)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"; MODEL = "gemini-3-pro-image"
REF1_IDLE = {l: P + f"slices/idle-vivarium-{l}-1024x568.png" for l in ("day", "dawn", "dusk", "night")}
REF1_NEAR = {l: P + f"slices/vivarium-near-{l}-544x408.png" for l in ("day", "dawn", "dusk", "night")}
MAP_IDLE = P + "rooms/map-idle-1024x568.png"; MAP_NEAR = P + "rooms/map-near-544x408.png"
BACKDROP = {"reeds": P + "slices/sitting-backdrop-pond-544x408.png", "boulders": P + "slices/sitting-backdrop-rock-544x408.png", "ferns": P + "slices/sitting-backdrop-wood-544x408.png"}
SUBJ = {"reeds": "reeds, rushes and damp ground", "boulders": "sandstone stone and scree", "ferns": "leaf litter and forest-floor ground"}
NEVER = {"reeds": "never its finish, never its water, never its pools or banks", "boulders": "never its flat, toon-like finish, never its angular flat-topped slabs", "ferns": "never its finish, never its tree trunks"}
HOUSE = ("The SAME terrarium inside the SAME rugged field device as Image 1, seen from the same eye height with the same lens and the same depth of field: "
         "the left wall with its braided feed line and connector, the right wall with its mister arm and slatted vent, the dark soil strip along the foot, each exactly where it is in Image 1. "
         "Inside it a NEW planting, painted in the Miniature Lives finish of Image 1: fine grain on the world, soft bokeh behind, a warm key light from the top left with its shafts. "
         "Cute by craft, never childish: no cartoon outlines, no toy colours, no gloss, no glow, no chrome, no alien tech. "
         "No creatures, no animals, no figures, no text, no letters, no digits, no logos, no frame, no UI. No water except one small flat seep. Pebbles and leaves at the scale of Image 1's.")
FLOOR = ("THE OPEN FLOOR (the light grey of Image 2, from its boundary with the dark grey down to the dark soil strip) is low open ground, the open floor sunlit as brightly as Image 1's floor, nothing a small creature could perch on: "
         "every piece on it lower than a pebble-and-a-half (about 32 px of a 568 px tall picture), at most two rounded or leafy pieces up to about twice that, never flat-topped; "
         "no flat raised top, no ledge, no slab, no step; no log, root or stem lying across the floor; everything tall stands BEHIND the back edge, its feet ending on it, never spilling forward onto the floor. "
         "The back edge of the floor (where open floor ends and the planting behind begins) runs along the boundary between the dark grey and the light grey of Image 2, or a little above it (never more than about 24 px), never below it. "
         "The device walls at the left and the right hold only the wall, the feed line and its connector at the left, the mister and the vent at the right, kept clear of planting.")
IDLE = {
 "reeds": ("THE NEW PLANTING: a reed and rush margin on damp ground. Tall reeds stand behind the floor, rising to about a quarter of the height from the top: slender straw-gold dry stems among green ones, "
           "fine seed heads catching the key light; the stand is densest at the centre-left (from about 37 to 64 percent of the width) and thinner to the right; their dark wet roots meet the floor's back edge; their feet end at the back edge; nothing on the floor larger than a small pebble except two pieces no larger than a fist. "
           "Low rush tufts at the far left, just right of the feed line. The floor: damp dark soil and short wet moss, three flat wet stones lying low with a soft sheen, one small seep of water no bigger than a hand's width "
           "(about 110 by 28 px) lying flat between about 41 and 59 percent of the width, reed litter lying flat. NO pool, no pond, no bank, no open water, no ripples, no reflections. "
           "Straw-gold and warm olive, never blue-green. Do NOT copy Image 1's burrow, root mound, succulents or its pool: Image 1 is the authority on the device, camera, scale, finish and light only."),
 "boulders": ("THE NEW PLANTING: two great rounded sandstone boulders, smooth and weathered, with lichen and moss in their cracks. The large one fills the back left (from about 12 to 41 percent of the width, its top at about 35 percent of the height); "
              "the smaller one stands right of centre (from about 55 to 70 percent of the width, its top at about half the height). Both are domed and rounded all over: no flat top, no ledge, no cliff, no climbable face, no crag; their feet end at the back edge; nothing on the floor larger than a small pebble except two pieces no larger than a fist. "
              "Fans of fine scree at their feet stop at the floor's back edge. Cushion plants and small succulents in the gaps. The floor: fine scree, small pebbles, moss and low cushion plants, two rounded stones at most. "
              "The stone is warm ochre-grey sandstone lit from the top left, its shadow side warm, never blue granite. Do NOT copy Image 1's burrow, root mound, succulents or its pool: Image 1 is the authority on the device, camera, scale, finish and light only."),
 "ferns": ("THE NEW PLANTING: a fern bank of broad fronds fanning out across the back (from about 29 to 74 percent of the width, rising to about 28 percent of the height from the top): deep green fronds with lighter new fronds and curled croziers. "
           "A fallen log, mossy and soft-barked, lies along the back edge of the floor from about 14 to 55 percent of the width, its top at about 58 percent of the height and its underside resting ON the back edge, fronds growing over it; it never crosses onto the floor. "
           "The floor: leaf litter lying flat in warm browns, moss, a few small croziers, two small fern tufts at most; their feet end at the back edge; nothing on the floor larger than a small pebble except two pieces no larger than a fist. No tree trunks, no forest: it is a terrarium planting. "
           "Fern greens warm, never cooler than Image 1's moss. Do NOT copy Image 1's burrow, root mound, succulents or its pool: Image 1 is the authority on the device, camera, scale, finish and light only."),
}
NEAR = {
 "reeds": "THE NEW PICTURE: reed stems framing both sides, rising out of the top of the frame; a flat wet stone at the right (from about 81 to 96 percent of the width); seed heads soft in the back; the floor in front, across the centre, open damp moss.",
 "boulders": "THE NEW PICTURE: the rounded flank of a sandstone boulder filling the left side (the left quarter of the width); a slope of fine scree and cushion plants at the right; the floor across the centre open and finely pebbled.",
 "ferns": "THE NEW PICTURE: fern fronds arching in from both top corners; the mossy log's end at the right (from about 77 percent of the width to the edge), lying behind the floor line; leaf litter lying flat across the centre of the floor.",
}
def job(name, aspect, refs, prompt):
    return {"name": name, "model": MODEL, "aspect": aspect, "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}
jobs = {}
for room in ("reeds", "boulders", "ferns"):
    jobs[f"idle-vivarium-{room}-day-{DAY}"] = job(f"idle-vivarium-{room}-day-{DAY}", "16:9", [
        [REF1_IDLE["day"], "IMAGE 1, THE AUTHORITY (room 1's signed painting by day): the device, the camera, the lens, the scale, the finish and the light. Never the layout of its planting; none of its floor dressing (roots, succulents, stones, seep) appears:"],
        [MAP_IDLE, "IMAGE 2, THE LAYOUT MAP (structure and placement only, never the look), a diagram; nothing of it is painted: the dark grey is the back zone where the tall planting stands; the light grey is the open floor; where they meet is the floor's back edge:"],
        [BACKDROP[room], f"IMAGE 3, SUBJECT AND MATERIAL ONLY ({SUBJ[room]}): {NEVER[room]}:"]],
        "Output a NEW image, 16:9. " + HOUSE + " " + IDLE[room] + " " + FLOOR)
    jobs[f"vivarium-near-{room}-day-{NEAR_DAY}"] = job(f"vivarium-near-{room}-day-{NEAR_DAY}", "4:3", [
        [REF1_NEAR["day"], "IMAGE 1, THE AUTHORITY (room 1's signed close-up by day): the camera at ground level, the lens, the depth of field, the scale, the finish and the light. Never the layout of its planting; none of its floor dressing (roots, succulents, stones, seep) appears:"],
        [MAP_NEAR, "IMAGE 2, THE LAYOUT MAP (structure and placement only, never the look), a diagram; nothing of it is painted: the dark grey above is the soft back; the light grey below is the ground:"],
        [BACKDROP[room], f"IMAGE 3, SUBJECT AND MATERIAL ONLY ({SUBJ[room]}): {NEVER[room]}:"]],
        "Output a NEW image, 4:3: this room seen much CLOSER and at GROUND LEVEL, at the creatures' scale, in the same warm daylight from the upper left, the same Miniature Lives finish (fine grain, soft bokeh behind) as Image 1. "
        + NEAR[room] + " The open floor across the centre of the lower part (from about 25 to 75 percent of the width and from about 72 to 86 percent of the height, inside the light grey of Image 2) is moss or soil only, sunlit as brightly as Image 1's floor, nothing on it taller than a tiny pebble; nothing busy directly behind the middle of the picture: the features frame it from the sides and from far back. "
        "No creatures, no animals, no figures, no text, no letters, no digits, no frame, no UI, no pool, no open water, no cliff or ledge. Cute by craft, never childish: no cartoon outlines, no toy colours, no gloss, no glow.")
# Round c (art director's ruling after 1b, lead's go 2026-10-26): two rounds copied room 1's whole painting into the floor (its dressing; in Ferns the map),
# so Image 1 is no longer room 1's whole picture: it is only the top strip of it (rows 0-189: the device walls, feed line, mister, vent, the soft back and the key light),
# which holds nothing of the floor. The device is pasted pixel-true at 0 MXN after (rooms.py), and the light is brought to room 1's measured targets by the 0 MXN band grade.
# Added: the floor's light, a calm floor in colours apart from the minis' browns, the two front occluders (owner 17:55), Ferns told no flat grey area, Reeds at two stones.
TOP_STRIP = P + "rooms/ref-top-day-1024x190.png"
HOUSE_C = ("Image 1 is ONLY the top strip of this very picture (the top third): continue it downward into a full 16:9 picture of the SAME terrarium inside the SAME rugged field device, from the same eye height with the same lens and depth of field: "
           "the left wall with its braided feed line running down to its connector, the right wall with its mister arm and slatted vent, a dark soil strip along the foot. "
           "Inside it a NEW planting, painted in the Miniature Lives finish of Image 1: fine grain on the world, soft bokeh behind, a warm key light from the top left with its shafts. "
           "Cute by craft, never childish: no cartoon outlines, no toy colours, no gloss, no glow, no chrome, no alien tech. "
           "No creatures, no animals, no figures, no text, no letters, no digits, no logos, no frame, no UI. No water except one small flat seep. Pebbles and leaves small: a pebble about 6 to 10 px across in a 568 px tall picture.")
FLOOR_C = ("THE OPEN FLOOR (the light grey of Image 2, from its boundary with the dark grey down to the dark soil strip) is low open ground in full warm sunlight, as bright and warm as the sunlit top of Image 1, never in shadow, never cool or grey; "
           "it is CALM and plain: mostly short even green moss with a little soil, few pebbles, no scatter of litter, scree or debris, so that small dark, brown and teal creatures read clearly against it; nothing on it brown and rounded like a small animal. "
           "Nothing a small creature could perch on: no flat raised top, no ledge, no slab, no step; no log, root or stem lying across the floor; "
           "everything tall stands BEHIND the back edge, its feet ending on it, never spilling forward onto the floor. "
           "The back edge of the floor (where open floor ends and the planting behind begins) runs along the boundary between the dark grey and the light grey of Image 2, or a little above it (never more than about 24 px), never below it. "
           "Nothing on the floor larger than a small pebble except TWO LOW FOREGROUND PIECES at the very front of the floor, their bases on the top edge of the soil strip (about 92 to 96 percent of the height), each no larger than about 96 px wide and 48 px tall: "
           "one in the left third (between about 12 and 30 percent of the width), one in the right third (between about 68 and 85 percent of the width); a small creature walking behind one is partly hidden by it. "
           "The device walls at the left and the right hold only the wall, the feed line and its connector at the left, the mister and the vent at the right, kept clear of planting. "
           "Image 2 is a diagram: no flat grey area, no grey band, no grey slab and no straight-edged shape of any kind is painted; every part of the floor is moss, soil or stone.")
IDLE_C = {
 "reeds": ("THE NEW PLANTING: a reed and rush margin on damp ground. Tall reeds stand behind the floor, rising to about a quarter of the height from the top: slender straw-gold dry stems among green ones, "
           "fine seed heads catching the key light; the stand is densest at the centre-left (from about 37 to 64 percent of the width) and thinner to the right; every stem and root ends at the floor's back edge: their feet end at the back edge, no roots spread onto the floor. "
           "The far left, just right of the feed line, holds only low rushes behind the back edge. "
           "The floor: short wet moss, two flat wet stones lying flush with the moss, one small seep of water no bigger than a hand's width (about 110 by 28 px) lying flat between about 41 and 59 percent of the width. "
           "The two foreground pieces are a small rush tuft (left) and a low clump of short reed shoots (right). NO pool, no pond, no bank, no open water, no ripples, no reflections. Straw-gold and warm olive, never blue-green."),
 "boulders": ("THE NEW PLANTING: two great rounded sandstone boulders, smooth and weathered, with lichen and moss in their cracks. The large one fills the back left (from about 12 to 41 percent of the width, its top at about 35 percent of the height); "
              "the smaller one stands right of centre (from about 55 to 70 percent of the width, its top at about half the height). Both are domed and rounded all over: no flat top, no ledge, no cliff, no climbable face, no crag; "
              "their feet end at the back edge, a little ABOVE the boundary of Image 2, never below it, with only a thin line of fine scree at their feet behind the edge. Cushion plants and small succulents in the gaps between them, behind the edge. "
              "The floor: short even moss with a few fine pebbles, no scree spread across it. The two foreground pieces are a small rounded mossy stone (left) and a low cushion plant (right). "
              "The stone is warm ochre-grey sandstone lit from the top left, its shadow side warm, never blue granite; the soft back no brighter than Image 1's."),
 "ferns": ("THE NEW PLANTING: a fern bank of broad fronds fanning out across the back (from about 29 to 74 percent of the width, rising to about 28 percent of the height from the top): deep green fronds with lighter new fronds and curled croziers. "
           "A fallen log, mossy and soft-barked, lies along the back edge of the floor from about 14 to 55 percent of the width, its top at about 58 percent of the height and its underside resting ON the back edge, fronds growing over it; it never crosses onto the floor. "
           "The floor: short even green moss with only a few flat fallen leaves, no carpet of leaf litter, no roots, no stones but small pebbles. The two foreground pieces are a low fern tuft (left) and a small clump of croziers (right). "
           "No tree trunks, no forest: it is a terrarium planting. Fern greens warm, never cooler than Image 1's foliage; the whole picture as warm as Image 1."),
}
for room in ("reeds", "boulders", "ferns"):
    jobs[f"idle-vivarium-{room}-day-c"] = job(f"idle-vivarium-{room}-day-c", "16:9", [
        [TOP_STRIP, "IMAGE 1, THE AUTHORITY (the top strip of room 1's signed painting by day, nothing of its floor): the device walls, the feed line, the mister and vent, the soft back, the finish and the light:"],
        [MAP_IDLE, "IMAGE 2, THE LAYOUT MAP (structure and placement only, never the look), a diagram; nothing of it is painted: the dark grey is the back zone where the tall planting stands; the light grey is the open floor; where they meet is the floor's back edge:"],
        [BACKDROP[room], f"IMAGE 3, SUBJECT AND MATERIAL ONLY ({SUBJ[room]}): {NEVER[room]}:"]],
        "Output a NEW image, 16:9. " + HOUSE_C + " " + IDLE_C[room] + " " + FLOOR_C)
LIGHT = {
 "night": ("NIGHT: warm and low. The floor stays lit like Image 2's night ground (the open floor brighter than the back zone); the back zone warm and dark; the moon only as a thin cool rim on the tops of the tallest pieces; "
           "no glow effects, no glowing moss, no lamps, no moon disc."),
 "dusk": "DUSK: the key light low and amber from the left, long soft shadows falling to the right, the back zone warm and dark; no lamps, no glow.",
 "dawn": "DAWN: the same key light, lower and paler; a thin cool haze in the back zone only; a soft floor; no glow, no lamps.",
}
def edit(room, pic, light):
    big = pic == "idle"; nm = f"idle-vivarium-{room}-{light}-a" if big else f"vivarium-near-{room}-{light}-a"
    src = f"art/station-masters/pods/rooms/signed-{pic}-{room}-day.png"; ref = REF1_IDLE[light] if big else REF1_NEAR[light]
    return nm, job(nm, "16:9" if big else "4:3", [
        [src, "IMAGE 1, THE PICTURE TO EDIT (this room's signed painting by day): keep everything, relight only:"],
        [ref, f"IMAGE 2, THE LIGHT TO MATCH (room 1's signed painting by {light}): take its light, colour and brightness only, never its planting or composition:"]],
        "Output a NEW image: Image 1 at " + LIGHT[light] + " Match Image 2's overall brightness and warmth. Keep Image 1 EXACTLY the same in composition and content: every reed, stone, frond, pebble, leaf, the device walls, feed line, mister, vent and soil strip in the same places and sizes, the same matte miniature finish; "
        "change ONLY the light and its colour. Do not move or add any piece, do not add a lamp, a moon disc or glowing things, do not recolour the materials. Still no creatures, no text, no water but the one small seep.")
for room in ("reeds", "boulders", "ferns"):
    for light in ("night", "dusk", "dawn"):
        for pic in ("idle", "near"):
            n, j = edit(room, pic, light); jobs[n] = j
os.makedirs("source/work/rooms", exist_ok=True); PJ = "source/work/rooms/prompts.json"; idx = json.load(open(PJ)) if os.path.exists(PJ) else {}
for n, j in jobs.items():
    assert j["tries"] == 1
    json.dump([j], open(f"source/work/rooms/{n}.json", "w"), indent=1); idx[n] = {"sha256": hashlib.sha256(j["prompt"].encode()).hexdigest(), "prompt": j["prompt"], "refs": j["refs"]}
json.dump(idx, open(PJ, "w"), indent=1); print(len(jobs), "jobs")

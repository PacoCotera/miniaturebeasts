"""Vivarium rooms 2-4 showpieces: the near day ("one mibi up close", 544x408) of each room whose Idle day is signed. Image 1 is that signed day, the only reference.
python3 -I tools/roomnear.py ROOM LETTER -> source/work/rooms/vivarium-near-<room>-day-s<letter>.json"""
import os, sys, json, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"; room, L = sys.argv[1], sys.argv[2]
FEATURE = {"boulders": "the rounded flank of one moss-capped pink-grey granite stone filling the left side (the left fifth of the width), a corner of the combed gravel and the edge of the stone lantern soft and far back at the right, a few bamboo stems in the far bokeh"}
PAINT = ("" if L == "a" else "It is a PAINTING, not a photograph: the same visible painterly brushwork and grain as Image 1, the bokeh painted as soft dabs like Image 1's, edges painted, nothing with photographic depth-of-field blur or photographic texture. "
         "The ground is Image 1's fine pale gravel combed in long straight low-contrast lines running across the picture, calm, no loose coarse pebbles. ")
prompt = ("Output a NEW image, 4:3: THIS room of Image 1 seen much CLOSER and at GROUND LEVEL, at the scale of a small creature, in the same light, palette and hand-painted miniature finish (fine painterly grain, soft bokeh behind, the ground sharp). "
 f"In view: {FEATURE[room]}. The features frame the view from the sides (the left and right fifths) and from far back, never a busy shape behind the middle. "
 "The ground fills the lower 40 percent of the picture. Across the centre of the ground (from about 25 to 75 percent of the width and from about 72 to 86 percent of the height) it is OPEN and plain, nothing on it taller than a tiny pebble, where one small creature will stand. "
 + PAINT + "No creatures, no animals, no figures, no text, no letters, no digits, no frame, no box, no UI, no pool, no open water, no cliff or ledge. Never photographic, never toon, never childish: no cartoon outlines, no toy colours, no gloss, no glow.")
n = f"vivarium-near-{room}-day-s{L}"; refs = [[P + f"rooms/signed-idle-{room}-day.png", "IMAGE 1, THE ROOM (its signed day painting): the place, palette, light and finish; seen closer in the new picture:"]]
idx_p = "source/work/rooms/prompts.json"; idx = json.load(open(idx_p))
if n in idx and idx[n]["prompt"] != prompt: raise SystemExit(f"{n} already written with another prompt")
json.dump([{"name": n, "model": "gemini-3-pro-image", "aspect": "4:3", "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}], open(f"source/work/rooms/{n}.json", "w"), indent=1)
idx[n] = {"sha256": hashlib.sha256(prompt.encode()).hexdigest(), "prompt": prompt, "refs": refs}; json.dump(idx, open(idx_p, "w"), indent=1); print(n)

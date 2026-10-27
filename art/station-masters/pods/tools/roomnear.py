"""Vivarium rooms: the near view ("one mibi up close", 544x408) of each room whose Idle day is signed. Image 1 is that signed day (the scene without pieces,
composite method), the only reference. The specimen's open floor [136, 296, 272, 56] (25-75 % of the width, 72.5-86 % of the height) stays plain ground.
Round ta (all four rooms on the composite-method days); the zen Boulders' sa/sb jobs stay on file as written.
python3 -I tools/roomnear.py ROOM LETTER -> source/work/rooms/vivarium-near-<room>-day-<letter>.json"""
import os, sys, json, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"; room, L = sys.argv[1], sys.argv[2]
FEATURE = {
 "roots": ("a curve of the old mossy honey-brown tree roots framing the left side (the left fifth of the width), the dark round burrow mouth soft and far back left of centre, soft green foliage in warm golden bokeh at the right side",
           "calm moss and fine soil in large soft patches, a faint lighter strip of soil"),
 "reeds": ("silver-green sedge blades beaded with raindrops framing both sides (the left and right fifths of the width), the rain-darkened rounded rock soft and far back left of centre, pale soft haze in the open centre behind",
           "short wet moss in large soft patches, calm"),
 "boulders": ("the mossy flank of the garden's island with a few fallen amber maple leaves framing the right side (the right fifth of the width), a low mossy granite stone at the left side (the left fifth), the maple's gold canopy soft in the far warm bokeh",
              "calm moss in large soft patches with a little fine soil, a fallen gold leaf or two only at the sides"),
 "ferns": ("deep green fern fronds framing the left and right sides (the left and right fifths of the width), a curled crozier soft behind at the right, the mossy log far back and soft, a faint low mist along the back, golden flecks of sun",
           "short bright moss in large soft patches, calm"),
}
feat, ground = FEATURE[room]
prompt = ("Output a NEW image, 4:3: THIS room of Image 1 seen much CLOSER and at GROUND LEVEL, at the scale of a small creature, in the same light, palette and hand-painted miniature finish (fine painterly grain, soft bokeh behind, the ground sharp). "
 f"In view: {feat}. The features frame the view from the sides and from far back, never a busy shape behind the middle. "
 f"The ground fills the lower 40 percent of the picture: {ground}. Across the centre of the ground (from about 25 to 75 percent of the width and from about 72 to 86 percent of the height) it is OPEN and plain, nothing on it taller than a tiny pebble, where one small creature will stand. "
 "It is a PAINTING, not a photograph: the same visible painterly brushwork and grain as Image 1, the bokeh painted as soft dabs like Image 1's, edges painted, nothing with photographic depth-of-field blur or photographic texture. "
 "No fittings, no objects, no pipes, no lantern, no bowls, no pond, no open water. No creatures, no animals, no fish, no figures, no text, no letters, no digits, no frame, no box, no UI, no cliff or ledge. Never photographic, never toon, never childish: no cartoon outlines, no toy colours, no gloss, no glow.")
n = f"vivarium-near-{room}-day-{L}"; refs = [[P + f"rooms/signed-idle-{room}-day.png", "IMAGE 1, THE ROOM (its signed day painting): the place, palette, light and finish; seen closer in the new picture:"]]
idx_p = "source/work/rooms/prompts.json"; idx = json.load(open(idx_p))
if n in idx and idx[n]["prompt"] != prompt: raise SystemExit(f"{n} already written with another prompt")
json.dump([{"name": n, "model": "gemini-3-pro-image", "aspect": "4:3", "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}], open(f"source/work/rooms/{n}.json", "w"), indent=1)
idx[n] = {"sha256": hashlib.sha256(prompt.encode()).hexdigest(), "prompt": prompt, "refs": refs}; json.dump(idx, open(idx_p, "w"), indent=1); print(n)

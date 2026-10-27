"""Vivarium rooms 2-4 as showpieces (owner 2026-10-26 18:05; art director's re-brief; lead's go on the option round): one Pro request per room,
a 2x2 sheet of four genuinely different concepts at 1K, text only, no references (two rounds showed the model paints in any map or crop it is given).
tries 1. The owner picks one option per room; that tile becomes the room's Image 1. python3 -I tools/roomoptions.py -> source/work/rooms/options-<room>.json"""
import os, json, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
COMMON = ("A contact sheet of FOUR separate paintings in a 2 by 2 grid, each the same size, separated by thin plain dark gutters; no labels, no letters, no numbers, no text anywhere. "
 "Each painting is a different concept for the same kind of view: the inside of one terrarium room inside a rugged, matte field device, seen straight on from a low eye height, wide, with a soft out-of-focus back and a sharp floor. "
 "In every painting the lowest third is a LOW, CALM, OPEN FLOOR running the full width: mostly short even moss or fine soil, plain and quiet, few pebbles, no litter or scree scattered over it, so that small creatures would read clearly on it; "
 "a thin dark soil strip along the very bottom edge; two small low foreground pieces sit at the front of the floor, one in the left third and one in the right third, each no taller than a tenth of the picture; "
 "all tall planting and every life-support fitting stands BEHIND the floor, in the back two thirds, never on the floor and never along the side edges as a hose or pipe running down a wall. "
 "Painted in a warm hand-crafted miniature-diorama finish: fine painterly grain, soft bokeh behind, believable materials, never photographic, never toon, never childish, no cartoon outlines, no toy colours, no gloss, no glow, no chrome, no alien tech, never a box or a cabinet. "
 "No creatures, no animals, no figures, no pool or pond, no open water, no cliff, no crag, no ledge. The four concepts must be clearly different from each other in palette, mood, light and fittings. ")
OPT = {
 "reeds": ("The room is a reed and rush margin on dry damp ground. "
  "TOP LEFT: a marsh margin on a misty gold morning: backlit straw-gold reeds with rim-lit seed heads in pale haze; a thin cane-and-brass drip rail runs across the top of the back with small drips falling into the reeds; a small float gauge on a reed stake at the back right. "
  "TOP RIGHT: a sedge meadow just after rain under soft overcast light: silver-green sedges beaded with droplets, cool grey-green palette with a warm moss floor; a ceramic rain-catch funnel on a slim copper stand at the back left. "
  "BOTTOM LEFT: late-summer dry rushes in russet, ochre and straw under warm low wind-tossed light; a wicker-wrapped humidity cylinder standing at the back right among the rushes. "
  "BOTTOM RIGHT: a fen of deep green horsetail stems with banded joints and a few cattails, a blue-grey slate back, cool clear light with warm accents; a small brass drip reservoir hanging from a hook at the centre back."),
 "boulders": ("The room is a garden of great rounded boulders, domed all over, never a cliff, ledge or crag. "
  "TOP LEFT: sun-warmed sandstone boulders at dry high noon, ochre, rust and sage, hard warm light with short crisp shadows; a matte ceramic heat tile set in the back wall between the boulders and a low slatted vent at the far left of the back. "
  "TOP RIGHT: pale limestone boulders with alpine cushion plants and tiny flowers in cool crisp mountain light, white, sage and sky-blue haze; a slender copper thermometer tube and small wind vane on a post at the back right. "
  "BOTTOM LEFT: dark rounded basalt boulders with rust-orange lichen and silver succulents, a dusky violet-grey back, warm side light; a matte terracotta heat hood on a short arm above the back centre, unlit. "
  "BOTTOM RIGHT: huge river-smoothed pink-grey granite pebbles with moss caps in dappled green light; a bamboo spout dripping onto the moss at the back left."),
 "ferns": ("The room is a fern planting, a terrarium, never a forest, no tree trunks. "
  "TOP LEFT: a shaded fern dell in dappled green-gold, deep greens and peat, cool shade with warm flecks of sun; a mossy log along the back of the floor; a ceramic fogger bowl behind the log laying low fog along the back only, and thin copper drip lines down through the fronds. "
  "TOP RIGHT: a misty cloud-forest bank of maidenhair ferns and moss cushions in silver mist, cool blue-green with pale light; a small glass-and-brass fog bell hanging on the back wall. "
  "BOTTOM LEFT: autumn bracken in rust, copper and gold under warm low light; a clay drip pot hanging from a cord at the back right. "
  "BOTTOM RIGHT: lush hart's-tongue and bird's-nest ferns in deep emerald in warm humid haze; a ribbed ceramic humidifier column standing at the back left among the fronds."),
}
idx_p = "source/work/rooms/prompts.json"; idx = json.load(open(idx_p))
for room, txt in OPT.items():
    n = f"options-{room}-a"; prompt = "Output ONE image, 16:9. " + COMMON + txt
    j = {"name": n, "model": "gemini-3-pro-image", "aspect": "16:9", "size": "1K", "tries": 1, "refs": [], "prompt": prompt}
    json.dump([j], open(f"source/work/rooms/{n}.json", "w"), indent=1); idx[n] = {"sha256": hashlib.sha256(prompt.encode()).hexdigest(), "prompt": prompt, "refs": []}
json.dump(idx, open(idx_p, "w"), indent=1); print("3 jobs")

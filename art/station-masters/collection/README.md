# The mibi collection, v2: the art job

The art job of the collection v2 build (the collection v2 design, the Builder checklist's art job; the collection v2 art direction), code and hand work on the signed masters only: no new painting and no paid image call.

## The rooms (art job items 1 to 4)

`source/rooms_v2.py` takes the rooms folder of masters-pods at the commit the Station places (rooms.json `source.commit`, b7bc7c9e) and writes a copy of it with the changes; the placer places the copy:

```
git -C <masters-pods> archive b7bc7c9e art/station-masters/pods/rooms | tar -x -C /tmp/mp-b7bc7c9e
python3 art/station-masters/collection/source/rooms_v2.py /tmp/mp-b7bc7c9e/art/station-masters/pods/rooms /tmp/mp-v2/art/station-masters/pods/rooms
node prototypes/ui/tools/place-masters.mjs --rooms /tmp/mp-v2/art/station-masters/pods/rooms/rooms-manifest.json --source-commit "b7bc7c9e + collection v2 art job"
node prototypes/ui/tools/place-masters.mjs --check
```

- **The windows.** Each room's `view` in the manifest, carried into rooms.json as `crop`, `keep` and `drops`: the crops of §4 ([0, 96], [176, 96], [178, 96], [152, 96]), the key props each window holds whole (the starting boxes of §4 tightened to their ink at 1x), and the eight drop spots of §4's table, all checked at 1x (place-masters `--check`, guard 8: every piece left in the view, every join, the bed and every key prop inside the window, a prop that runs off the painting reaching the painting's edge on that side; each drop on a level, off the keep-outs, the bed and the joins, inside [cx + 56, cx + 632], 88 apart at one depth). reeds-sedge-1 and ferns-fern-1 leave the room view's pieces (`view: false`).
- **The moved pieces** (§4): Roots' bed [248, 496, 192, 56], stone-2, mister and mist-2; Reeds' rain cup (its drop from the lip at x 844); Boulders' stone-2, shishi, the arm and its pivot (+32 px; the trickle with them), cushion-1, and the lantern on the mound's crest between the maple and the tall stone, its foot on the moss at 1x ([677, 282, 34, 44]); Ferns' copper lines and crozier-1. Each occluder's keep-out moves with it (derived, never typed).
- **Boulders' rear stone** (x 842 to 915) painted out of the four seated idle bases: the haze row by row between the haze on each side with its own grain, the moss mound closed behind it from the tall stone's shoulder to the moss it meets (the mound's moss 50 px to the right, its rows aligned on the two tops), the tall stone carried down with its own texture.
- **Roots' bed** re-lit for its new ground on the path in the four lights: the ground's light matched part way (the gain per light is in the manifest's `collection_v2.bed_gain`) and a contact shadow of the path's own soil under the nest, inside its 192 x 56 rect.
- **The room chips**: 128 x 32 cuts, 1:1, from inside each window in the four lights: Roots the burrow's dark mouth, Reeds the sedge blades over the rock's dark foot, Boulders the pond's water inside its rim stones, Ferns the log under its moss. The name's area sits on the cut's calm dark band.

Every changed file is placed as `new`, not final (the manifest's `unsigned`), for the art director's check at 1x; the rest keep their signatures.

## The marks (art job item 5)

`source/marks.py` draws the 16 x 16 state marks, palette-exact pixel work, none painted; `slices/manifest.json` gives each size and hash and `slices/status.json` places them as new, for the art director's 1x proof:

```
python3 art/station-masters/collection/source/marks.py
node prototypes/ui/tools/place-masters.mjs --from art/station-masters/collection --group collection --status --by "code-drawn by the builder, collection v2 art job 5, for the art director's 1x proof"
```

| Id | Size | What |
| --- | --- | --- |
| `mark-heart-16` | 16×16 | bonded: the enamel heart re-cut at 16 from the signed `heart-full-24` (its shape and its four colours) |
| `mark-elder-16` | 16×16 | elder: a walking stick, a 2 px shaft and a 4 px hooked head at the top left, `sand` with a `bark` shadow side, its foot on row 15, no notches |
| `mark-asleep-16` | 16×16 | resting after a cross: the placed asleep mark cut at 16, the moon whole and its dots drawn closer |
| `mark-cold-16` | 16×16 | tucked away: the placed cold mark (`mark-species-frost-24x24`) cut at 16, its rim and its speckle |
| `mark-companion-outline-16` | 16×16 | away with the Companion: the handheld's outline in `bone` |
| `mark-companion-solid-16` | 16×16 | on the Companion, docked: the handheld solid, `bone` with a `fog` shade, its screen `ground` |

The coming-out mark is the waiting lamp at 12 as it is (`home-lamp-sky-12x12`). The Incubator capsule (a child growing) comes later, with breeding.

![The marks on their discs at 8x](proof-marks-8x.png)

*proof-marks-8x.png: the set side by side at 8x, each on the 20 px disc the build draws (`panel` fill, a 1 px `bevel` rim): the Companion outline and solid, the lamp, the moon, the heart, the stick, the cold mark.*

![The marks on their discs over the four rooms in the four lights at 1x](proof-marks-1x.png)

*proof-marks-1x.png: rows Roots, Reeds, Boulders, Ferns; columns dawn, day, dusk, night; each mark on its disc over a patch of the room's window.*

## The Wall's art (the art the collection Wall still owed)

Made to the signed table; each piece is a script in `source/`, its output under `slices/`, a 1x proof (and an 8x proof where the table asks), for the art director's check at 1x. None is wired into the screen code. Run with Pillow: `python3 art/station-masters/collection/source/<script>.py`.

- **`mark-breather-16`** (`source/marks.py`, `slices/mark-breather-16.png`): "on a breather", a pause sign (owner, 1 Nov 2026; it replaced the three curling streaks of breath, which could not be read): two upright bars 4 px wide, `mint` over a row of `aqua` underside, so it is told apart from the moon, heart, stick, lamp, handheld and cold mark by silhouette and by hue. Proofs: `proof-breather-1x.png` and `proof-breather-8x.png` (the breather first, then moon, heart, stick, lamp, handheld solid and outline, cold; top row on the 20 px disc, bottom row inline with no disc, on `ground`); it is also in the set proofs `proof-marks-1x.png` (four rooms, four lights) and `proof-marks-8x.png`.
- **Room ticks 1 to 10** (`source/room_ticks.py`, `slices/tick-room-01-20x3.png` to `tick-room-10-20x3.png`, `slices/ticks.json`): 20x3; rooms 1 to 6 whole in `sky`, `sprout`, `sand`, `lilac`, `aqua`, `pink`; rooms 7 to 10 the hues of 1 to 4 as a broken tick (9 px, 2 px gap, 9 px). Proof: `proof-ticks-1x.png`, all ten on `ground` at 1x (rooms 1 to 6 above, 7 to 10 under 1 to 4).
- **The settling cut** (`source/settle_cuts.py`, `slices/room-<room>-rail-settling-<light>-164x40.png`, 16 files, `slices/settling.json`): each 164x40 rail cut at x0.55 brightness, each colour channel multiplied and rounded, the hue kept. Proof: `proof-settling-1x.png`, each room's cut with its settling cut under it, four lights across, at 1x.
- **The find mark** (`source/find_mark.py`, `slices/mark-find-lit-16.png`, `slices/mark-find-outline-16.png`, `slices/find.json`): the glint-star-12x12 master placed 1:1 and centred on 16 px (lit); its outline derived from the glint's pixels at alpha 0x20 and over, grown one pixel in the four directions, a 1 px `fog` line with the shape left empty; it equals its own mirrors and spans rows and columns 2 to 13. Proof: `proof-find-1x.png`, both on `ground` at the Add a room row's line 2 position.
- **The Family light set** (`source/family_light.py`, `slices/family-*.png`, `slices/family.json`), baked from §8's numbers, palette tokens only, all plain alpha, placed 1:1: `family-field-706x519` (opaque; `ground` at the edge, the warm lift toward (344, 250) held in 6 steps over the outer 30%, the centre's bloom baked in); `family-pool-<centre|parent|young|mate>-WxH` and `family-shadow-w<124|92|72|48>-WxH` (canvases centred under the feet; the pool's role strength baked into its alpha; a tucked or returned figure takes the shadow alone); `family-glow-h-64x14` and `family-glow-v-14x64` (the 14 px strips, to crop to a run's length, drawn under the 2 px `sand` core); `family-node-6-18x18` and `family-node-4-18x18`; `family-returned-92x94` (the species' own stand at 92/304, flat `hairline`, the stand's alpha kept). Proofs at 1x, each a whole 706x519 field with stands, names, lines, nodes, pools and shadows: `proof-family-a-1x.png` (one group, centred, with a mate), `proof-family-b-1x.png` (a returned parent), `proof-family-c-1x.png` (no young), `proof-family-d-1x.png` (several groups, with the spine). Readings where §8 gave no number: the lift's peak (`amber` at 14%), the pool role scale as strength rather than size, the 4 px node's halo (10 px), the returned silhouette's shape (generic), the glow's falloff (linear) and the pool's (power 1.5).
- **The three find pictures at 112** (`source/find_pictures.py`, `slices/find-reed-bundle-112x112.png`, `slices/find-moss-stone-112x112.png`, `slices/find-fern-crown-112x112.png`, `slices/finds.json`): painted pieces, one request each with the signed Reeds, Boulders and Ferns paintings as the style references (the matching room's first), each on a flat fill that the script keys out (the fill's hue taken out of every soft edge pixel), crops to the ink and fits to 104 px centred on a transparent 112 canvas. The painted originals are kept in the art job's folder; the script takes that folder as its argument. Proof: `proof-finds-1x.png`, the three at 1x on `panel` and on `ground`.

The fern crown has its front loop painted out (the copper circlet, its knot and the fronds stay).

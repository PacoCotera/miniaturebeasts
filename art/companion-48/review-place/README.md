# Companion 48 px redraw: the review place

The [Companion 48 px redraw](../../../design/proposals/companion-48px-redraw.md) (§9 Decided) on one place, the meadow and pond edge in a storm, with every piece it needs at 1× on the 48 ramps of the [signed palette](../palette/README.md). Everything here is **a candidate for the owner's review**: generated sources down-rendered by script, an Aseprite pass for the meadow, scripted chrome and water, Retro Diffusion sprites beside the scripted ones where one was picked, and Pip derived into the Loika token. Nothing is accepted; nothing touches `prototypes/exploration/index.html`.

**State: round 4 ready for the owner.** It answers the owner's five notes on round 1 and their answers on rounds 2 and 3 (below). Rounds 1 to 3 are frozen in [`round1/`](round1/), [`round2/`](round2/) and [`round3/`](round3/). How every group is made and how to rebuild: [`../HANDOVER.md`](../HANDOVER.md) and `sh tools/build-all.sh`.

![Contact sheet at 3×](contact-sheet-3x.png)

*Every piece at 3× ([1× here](contact-sheet-1x.png)); a piece that changed since round 3 shows round 3 (r3) beside round 4 (r4). The shore test and the Retro Diffusion group are laid out in their own groups. Candidates, not accepted.*

## The owner's answers on round 3, and what answers each

1. **Water: a second tile variant per frame.** `water1b`/`water2b` (and `deep1b`/`deep2b`), laid by the compose script's seeded hash (below).
2. **Stones: the charged bolt is good; the warm stone is wrong ("a circular glow doesn't make sense, it's a rock").** The charged stones are kept as they were; the warm stone is redrawn as rock with a thin warm vein, no halo and no round core (below).
3. **The pawn: "it cannot look like a Teletubby".** Redrawn as a hooded explorer with a pack, a real hand pass in Aseprite on the VM (below).

## The owner's answers on round 2, and what answers each

1. **Light: the mild storm stands; the teal is rejected.** The teal variant is removed (table, still and figure); `--light storm` is the only light the compose script offers besides the no-table and DARK references.
2. **Water: the ripple rings repeat on a grid.** The tiles carry only the depth gradient, crests and glints; the rings are sparse overlay sprites (below).
3. **Shore: it breaks at certain corners.** Found by laying every neighbourhood; the set is closed (below).
4. **Stones: "redo them".** All six stones and the stepping stone through the Retro Diffusion recipe, then a hand pass for the states (below).
5. The hand-clean list: dew cup, grass2's repeating motif and the creep frames (below; the creep frames are now part of the new pawn).

## The owner's five notes on round 1, and what answers each

1. **"Dark, and the rain too heavy."** The round 1 still darkened everything one ramp step. Round 2 uses no DARK step: the ground, water and plain stones go through a *storm table* (each colour mixed 30 % toward river, nearest palette colour; sand, clay, paper, bone and white kept), and the canopies and the lit stones keep their own colours (decision below). The pawn and mibis never pass through a table. The rain tile has 10 streaks per 96 px (round 1: 26). Limit: the storm reads mild; the owner chose that over a stronger teal cast.
2. **"The grid is not seamless."** A real Aseprite pass (1.3.18, headless on the VM, `tools/aseprite-meadow.lua`): all eight meadow tiles (grass ×4, tall ×2, flowers ×2) take one shared outer band, the master's interior offset by half a tile, blended inward and snapped to the tile's colours; grass3 and grass4 took an 18 px band (8 px left a faint horizontal structure in their own 3×3). Any meadow tile joins any other.
3. **"Pawn, trees and stones good but dark."** Painted values lifted 18 % before quantising, nothing darkens them in the still beyond the storm cast on plain stones; Retro Diffusion sprites run through the same lift.
4. **"River borders too wavy."** The shoreline amplitude is 0.9 + 0.5 px (was 2.2 + 1.3); a shallows band lies between bank and water; the foam line stays.
5. **"Water flat."** Water redrawn (below), two frames.

## The ground, seamless

![Every meadow tile laid 3×3 at 1×](work/preview-meadow-3x3-1x.png)

*Each meadow tile laid 3×3 at 1×, after the Aseprite pass (grass3, grass4 at band 18). Candidate.*

![The meadow tiles laid in a seeded random 6×6 at 3×](work/meadow-mixed-3x.png)

*All eight meadow tiles laid in a seeded random 6×6 ([1×](work/meadow-mixed-1x.png), `tools/meadow-check.py`): the mean colour step across a tile join is 4.8 against 13.4 inside the tiles, and no join shows at 1× or 3×. Candidate. Limit: grass2's dark bracket motif repeats visibly when it is laid several times near each other; it is the one tile to thin out at placement.*

The shore set (16 masks × 2 frames) is cut again from these tiles, the shallows and the new water ([contact sheet](contact-sheet-3x.png), group 2).

## Water

![Water ×2, deep ×2, shallows, a shore tile and a diagonal corner at 3×](work/preview-water-3x.png)

*Round 4 water tiles, 3×: water1, water1b, water2, water2b, deep1b, shallows, shore-03-1, shore-diag-ne-1. No rings in any tile. Scripted candidate (`tools/build-water.py`).*

Two variants (a, b) of each frame, so the page can lay them by a hash. Each carries a few small soft pools (blobs of the deeper step read through a 4×4 Bayer matrix, at most about half-dithered) that fade to nothing over the outer 8 px, so any variant joins any other at the tile edge with no seam, and short crests in the lighter step with an ice glint that keep clear of the left and right edges and drift 3 px between the two frames (the pools do not move). The deep tiles are the same one step down the ramp. The compose script gives each water cell a variant by a seeded hash (`RandomState(31)`, half and half) and the deep overlay takes the same cell's variant; the page can do the same. Limit: with two variants a pool pattern still recurs at a distance; at 1× it reads as texture, not as a grid.

![The three ripple sizes, two frames](work/preview-ripples-5x.png)

*Ripple overlay sprites, 5×: three sizes (13, 19 and 25 px wide in frame 1) × two frames; broken flat rings in the lighter step with an ice glint, the gaps moving and the ring widening by 2 px between the frames. They are pieces of the props sheet (`ripple-N-F`, sprites, anchor at the foot), never part of a tile.* Placement is the compose script's, and the page can do the same: a seeded hash (`RandomState(48)`) walks the view in 3×3-tile blocks, each block takes at most one ripple (75 % of blocks), at a hashed size and position inside the block; a ripple is drawn only where its whole ring lies over water, so none sits on the shore and none repeats on a tile boundary; one per block means none sits on the same spot twice. The still draws frame 1; the page alternates the frames.

The two Retro Diffusion water tiles of round 2 (`sources/rd/C48-R-r2-water1`, `-water2`) stay as labelled candidates, unused.

## The shore

![The 47 neighbourhood classes and a random pond, from the contact sheet](work/preview-shore-test-1x.png)

*Shore test: each land tile laid with every neighbourhood it can have; see the groups "Shore test" on [the contact sheet at 3×](contact-sheet-3x.png) and [the random pond at 1×](work/shore-test-pond/pond-outline-random.png). Scripted candidate.*

What was broken: a land tile with water only on a diagonal had no piece, so the pond's corner left a square notch where two bank strips met at a tile corner; and where two adjacent sides are water the land corner was square. Now: **16 cardinal masks** (N=1 E=2 S=4 W=8, water on that side, 2 frames) with the land corner rounded where two adjacent sides are water; **4 diagonal corners** (`shore-diag-ne/se/sw/nw`, 2 frames), a quarter-disc of water with its bank bands, transparent where it would be plain grass, laid over any land tile that has water on a diagonal and on neither side of that corner. Their depth carries the neighbouring strips' wave so the bands meet at the tile join. `tools/shoregrid.py` lays all 256 neighbourhoods and 40 random ponds and counts the pixels where the land / bank / water class differs across a tile join: round 2's set **14 976** broken pixels over the 256 neighbourhoods and **20 085** over the ponds; round 3's **768** and **1 030**, at most 4 pixels per join, which is a one-pixel offset of a band edge, not a gap (every join has the same classes, within a pixel). The page does the same pass: for each land tile, the cardinal mask, then each diagonal corner whose two sides are land.

## The still

![The review place in a storm, 450×600 at 1×](still/companion-place-storm-48.png)

*450×600 at 1×: HUD 32, view 532, bottom line 36. `compose-still.py --light storm`: the storm table on ground, water and plain stones; canopies and lit stones exempt; pawn and mibis untouched; the pond closed by the shore set; ripples as overlay sprites; the six stones from the Retro Diffusion recipe (warm as a vein); the water laid in two variants by hash; the explorer pawn; the dew cup on the shore. Rain from the weather sheet; the message box, name tag, key caps and condition bolts from the ui sheet; the page's Mibi 7×9 font at 2×. 0 off-palette pixels. "Loika" is a text layer, never baked. Candidate.*

![Beside the accepted concept and the round 3 still](still/beside-concept-and-round3.png)

*Left, the accepted Companion concept; middle, the round 3 still; right, the round 4 still. Candidate.*

![Four-grey rendering of the still](still/four-gray/companion-place-storm-48-4gray.png)

*The round 4 still in four greys (also [sheets](sheets/four-gray/)). Re-read: the grass body is luma 159 (grey 3 of 4); the pawn's hood and coat are yellow (luma 211, grey 4: 38 % of its pixels), its face, trousers and boots dark (greys 1 and 2: 56 %), only 6 % of its pixels share the ground's grey. In round 1 the pawn's orange body and the darkened grass landed in one grey; in round 3 the pawn sat one step below the ground; now it is the lightest figure on the ground and its dark parts are darker.*

### The storm light: the art director's decision

- **Greens keep their ramp under the storm.** The tree's canopy went teal under the table and lost its identity; trees and bushes (tree, bush, bush-fruit, bush-shaken) are exempt and read as the lit, living thing against a cooler ground. The lit stones (warm, charged) are exempt too: their glow is the point and the table turned it grey.
- **The ground takes a blue cast only in its shade strokes**, not its body: the grass body keeps its value; the pawn is lighter than it. The owner confirmed this light and rejected the teal; a stronger cast is not offered.
- Water, plain stones, the hut and the shore go through the table.

## The sprites: Retro Diffusion beside the scripted piece, and the art director's pick

Each painted piece was cropped, its key-colour halo and purple ground shadow removed (alpha eroded one pixel, purple-cast pixels sent to white), put on white and sent as `input_image` (strength 0.5) to `rd_pro__topdown` with the 48-colour `input_palette` and `remove_bg`; the result is lifted 18 %, quantised onto the piece's ramps, despeckled and outlined by the ramp rule (`tools/rd-snap.py`). HiBit on the 48 ramps, ramp outline never black, no alpha, no anti-aliasing, 0 off-palette after the snap.

| Piece | Pick | Reason |
| --- | --- | --- |
| tree | scripted | Retro Diffusion draws a crisper canopy but loses the trunk to a stub and the ground shadow. |
| bush | scripted | Retro Diffusion's is darker with a grey patch artefact; the scripted bush is lighter and rounder. |
| bush-fruit | scripted | Retro Diffusion's berries mix with purple specks; the scripted red berries read at once. |
| stone, stone-plain2 | **Retro Diffusion + hand pass** | Facets and a lit top give volume; the scripted stones are smooth slabs with a skirt. Hand pass: a ground shadow. |
| stone-warm1, stone-warm2 | **Retro Diffusion rock + hand pass** | The owner: a circular glow is wrong on a rock. Both frames are the plain stone (stone-plain2's Retro Diffusion result) with a thin jagged heat vein drawn across it, a branch, and a shadow: frame 1 a dim rust vein with a few orange pixels, frame 2 the same vein a step brighter with amber and a yellow spark at two points. No halo, no round core, no spill. |
| stone-charged1, stone-charged2 | **Retro Diffusion + hand pass** | Retro Diffusion alone keeps the stone and loses the charge to faint cracks; the hand pass takes out the teal specks and draws a jagged bolt of white with ice beside it, a branch in sky, sparks off the silhouette, a shadow: the state reads at 1×. |
| stone-step (new, the stepping stone, same family) | **Retro Diffusion + hand pass** | A low flat stone from the plain stone's crop; a dark water line under it so it sits in the water. |
| outpost-lit | scripted | Retro Diffusion's hut is dark brown with a teal halo; the owner asked for lighter. |
| pod | scripted | Retro Diffusion turned the dark pod into a cream egg: a different object. |
| pawn (down, up, left, right) | **hand-drawn** (neither) | Retro Diffusion drew a different character and only the walk2 frame per facing; the round 3 pawn was a scripted down-render of a painted plush-like figure. Redrawn (below). |

The picks are in [`work/props/`](work/props/) and the sheets; the round 2 scripted stones in [`work/props-scripted/`](work/props-scripted/); every Retro Diffusion result, snapped and before the hand pass, in [`work/props-rd/`](work/props-rd/) and [`work/pawn-rd/`](work/pawn-rd/); raw results, inputs and sidecars in [`sources/rd-sprites/`](sources/rd-sprites/). The hand pass is `tools/hand-pass.py`, scripted so it can be re-run.

![The seven stones at 5×](work/preview-stones-5x.png)

*The stone family at 5× after the hand pass: stone, stone-plain2, stone-warm1, stone-warm2, stone-charged1, stone-charged2, stone-step. Candidates.*

## The pawn

![The pawn's frames at 6×](work/preview-pawn-6x.png)

*The explorer at 6×: down walk1 and walk2, up walk1, left walk1, right walk1 and walk3, creep (down creep1, right creep2, up creep3), react (down, right). Candidates.*

![The pawn beside the concept's pawn at 1×](work/pawn-vs-concept-1x.png)

![The pawn beside the concept's pawn at 3×](work/pawn-vs-concept-3x.png)

*Left, the concept's pawn (cut from companion-storm, scaled to the pawn's 40 px height); then the four facings' walk frames, a down creep and a right react on a meadow green, at 1× and 3×. Candidates.*

The brief: an explorer, not a plush toy; no round belly, no ball head, no single-tone orange blob; a small figure with a hood, a pack and limbs that read; the walk and creep consistent; never childish. What it is: a hooded figure in a yellow slicker (hood of 12 px with a dark opening and two small cream eyes, a red scarf at the neck, straps crossing the chest, a belt with a gold buckle, three-pixel arms with sand mitts, dark trousers, brown boots), a pack on the back with a bedroll across the top and a small amber lantern hung at its side (seen from behind and from the side), a two-row ground shadow in the cell. 37 px tall in the 48 px cell, foot at y 46. Four facings (the left is the right mirrored), walk 3 (contact, passing with the body one pixel higher, contact), creep 3 (the body three to four rows lower, the hood leaning forward and down, shorter strides), react (the body two pixels up, the feet off the ground, an arm raised). The coat is yellow, not the concept's orange: the body is two ramp steps lighter, which is what the four-grey check needs (below). Every part is a hand-set mask shaded by the rim rule (`tools/pawn-draw.py`: coordinates, polygons, pixel-set folds, face, straps, buckle, lantern); the 28 frames are then **assembled in Aseprite on the VM** as one tagged sprite (`tools/aseprite-pawn.lua`: frames in order, tags `down-walk`, `down-creep`, `down-react` and so on, saved as [`work/pawn-aseprite/pawn.aseprite`](work/pawn-aseprite/pawn.aseprite), every frame exported back; 0 pixels differ from the drawn frames). The Retro Diffusion pawn frames stay in [`work/pawn-rd/`](work/pawn-rd/), unused.

Limits: the face is a dark opening with two eyes, a deliberate mystery rather than a drawn face; the pawn carries no tool in hand (the lantern is on the pack); the up facing shows the hood's back seam but no expression; the hand pass is code-set pixels assembled in Aseprite, not strokes drawn by hand in its editor.

### The hand-clean list

grass2: the long bar, bracket and ramp of dark pixels that repeated on the grid are gone, small clumps in their place, the two outer pixels untouched so it still joins (see the meadow figures above). The dew cup: 29×17, a curled leaf with a pool of sea-to-sky dew, an ice highlight and two sparks; it reads at 1×. The creep frames are the pawn's own (above).

## What is generated, scripted, derived

| Group | Source | Script | Stage |
| --- | --- | --- | --- |
| Ground: grass ×4, tall ×2, flowers ×2, shade, sand, wet shore | One Pro-painted 4×4 grid ([`sources/C48-T-r1-a1`](sources/C48-T-r1-a1.json)): cut by the magenta margins, 10 % trim, wrap-blend, level-match across the meadow set, BOX to 48, quantise per ramps, despeckle (`tools/build-ground.py`); then the Aseprite pass on the VM for the eight meadow tiles | generated source, scripted down-render, Aseprite pass |
| Water, deep (2 variants × 2 frames each), shallows | Scripted (`tools/build-water.py`) | scripted |
| Ripple overlay sprites 3 sizes × 2 frames | Scripted (`tools/build-ripples.py`) | scripted |
| Shore set: 16 cardinal masks and 4 diagonal corners × 2 frames | Cut from grass1, sand, shallows and water along a wavy shoreline; rounded land corners; bone foam (frame 1), white (frame 2) (`tools/build-shore.py`); tested by `tools/shoregrid.py` | scripted |
| Props | One Pro-painted sheet on magenta ([`sources/C48-P-r1-a1`](sources/C48-P-r1-a1.json)): key, fit, lift 1.18, quantise per ramps, despeckle, outline (`tools/build-props.py`); the six stones and the stepping stone from Retro Diffusion (`tools/rd-sprites.py`, `rd-snap.py`) with the hand pass (`tools/hand-pass.py`; the warm stones as rock with a heat vein) | generated source, scripted down-render; Retro Diffusion stones with a hand pass |
| Warned strike ×2, HUD icons, key caps, condition bolts, 9-slices | Drawn by script on the ramps from the page's own icon forms (`tools/build-ui.py`) | scripted |
| Pawn: 4 facings × walk 3, creep 3, react | Drawn as masks and pixel sets (`tools/pawn-draw.py`), assembled and exported in Aseprite on the VM (`tools/aseprite-pawn.lua`) | hand-drawn, Aseprite |
| Tokens: Pip as Loika (idle 2, walk 3); placeholders S02–S04 | The accepted Pip painting, quantised and outlined (`tools/build-tokens.py`) | derived, scripted |
| Weather: rain tile 96×96, 2 leans × 2 frames | Scripted, 10 streaks per tile (`tools/build-weather.py`); Retro Diffusion stages rejected and kept in `sources/rd/` | scripted |

Sheets: six indexed PNGs (the ground sheet holds the tiles and the whole shore set; the props sheet the props and the ripple sprites) (indices 0–47 as signed, 48 transparent) with JSON atlases in [`sheets/`](sheets/); anchor = foot for sprites, top-left for tiles and chrome. Working pieces, one PNG each, in [`work/`](work/).

## Checks

- `tools/check.py` on the six sheets and the still: **0 off-palette, 0 semi-transparent pixels** on every one.
- Four-grey renderings: [`sheets/four-gray/`](sheets/four-gray/) and [`still/four-gray/`](still/four-gray/).
- Meadow joins: the 3×3 figure and the mixed 6×6 above (mean step across joins 4.8 against 13.3 inside the tiles, after grass2's hand pass).
- Shore joins: `tools/shoregrid.py`, 768 broken pixels over the 256 neighbourhoods, none wider than 4 per join.

## Sign-off checklist, §2 Painted master, art director's column (round 4)

From [`design/style-guide/sign-off.md`](../../../design/style-guide/sign-off.md) §2. Yes/no per line; failures listed, not hidden. The capabilities column is the builder's and is not signed here.

| Art direction | |
| --- | --- |
| From the accepted candidate, owner's notes applied (SS Decided) | **Yes**, with limits. The five notes are answered above; the forms, colours and light come from the accepted Companion concept through the painted sources. The owner's answers on round 2 are applied (the mild storm kept, the teal gone, the rings out of the tiles, the shore closed, the stones redone). Limit: the storm reads mild against the concept's dark teal, as the owner chose. |
| Station: painted light, soft shadows, no dither bands or flat fills (SG) | n/a: Companion pieces. |
| Companion: hand-pixelled on the 48 ramps, ramp outline never black, no alpha, Bayer only (SG; UK §2) | **Partial.** On the 48 ramps, outlines by the ramp rule, no alpha, no AA, Bayer only (water depth). **Not hand-pixelled:** the terrain, props, pawn and tokens are scripted down-renders of painted or Retro Diffusion sources with despeckling; the meadow had a real Aseprite pass, nothing else did. The stones are Retro Diffusion results with a scripted hand pass; the dew cup and the creep frames are scripted redraws and derivations. The pawn is drawn (masks and pixel sets, assembled in Aseprite). Failures: tree, bushes, hut, pod and tokens remain scripted down-renders without a hand pass; the pawn's pixels are set by code, not drawn with strokes in Aseprite's editor; a pool pattern in the water recurs at a distance. |
| Creature at its area, 300×310+ Station, 280×300 Companion, same trait boundaries (SG Creatures) | **Yes** for the one creature present: Loika is the placed Pip, derived from the accepted 280×300 painting, same individual; S02–S04 are labelled placeholders. |
| Same individual in four-gray and on paper; nothing childish (AD) | **Yes**, with a limit. Four-grey renderings made for every sheet and the still; Pip's token reads as Pip. The round 1 value fail is **fixed**, re-read on the round 4 still: the pawn is the lightest figure on the grass and its dark parts are darker than it (numbers above). Nothing childish: the pawn is a hooded explorer with a pack, set beside the concept's ball-headed figure and judged at 1× and 3× against it; the placeholders are plain grey stones with a code. Limit: not tested on paper (no paper render exists for the Companion); and the coat is yellow where the concept's pawn is orange, which the owner has not yet seen. |

Signed, art director, 2026-10-08. Failures: those listed in line three (no hand pass on the tree, bushes, hut, pod and tokens; the pawn's pixels set by code; the water's pool pattern recurring at a distance).

## Spend

| Call | Tool | USD |
| --- | --- | --- |
| C48-T-r1-a1 ground grid, C48-P-r1-a1 props, C48-W-r1-a1 pawn | Pro, 1K each | 0.53 |
| C48-R-r1-a1, a2 rain | Retro Diffusion rd_pro__topdown 96×96 | 0.36 |
| C48-R-r2-water1, water2 | Retro Diffusion rd_pro__topdown 48×48 | 0.36 |
| C48-S-r2 first sprite batch, 12 calls (superseded: magenta fringe on the inputs) | Retro Diffusion rd_pro__topdown | 2.16 |
| C48-S-r2 second sprite batch, 12 calls | Retro Diffusion rd_pro__topdown | 2.16 |
| C48-S-r2 stones batch (stone-plain2, stone-warm2, stone-charged2, stone-step), round 3 | Retro Diffusion rd_pro__topdown | 0.72 |
| Round 4: no paid call (the pawn, the warm stone and the water variants are scripted) | | 0.00 |
| **Total** | | **6.29** |

Re-summed from the sidecars by `tools/budget.py` into [`sources/budget.json`](sources/budget.json) (the superseded batch in [`sources/extra-spend.json`](sources/extra-spend.json)). Retro Diffusion balance left: $1.32.

## Limits and what the next round needs

- Only the stones, the dew cup, grass2, the pawn and the meadow had a hand pass or an Aseprite pass; the tree, bushes, hut, pod and tokens are scripted down-renders.
- Two water variants per frame: a pool pattern still recurs at a distance; a third and fourth variant would break it.
- The pawn is yellow, the concept's is orange; the face is a dark opening with two eyes.
- The map pawn, the reach variant, bubbles, settle pips, the partner ring, signs, map props, cloud and rim pieces are not in this round (the brief stops at the review place).

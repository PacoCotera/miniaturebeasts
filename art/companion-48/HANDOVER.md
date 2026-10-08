# Companion 48 px redraw: handover

State of the work on 2026-10-08, written for the studio session that takes round 2 over. Everything below is in this folder; nothing in `prototypes/exploration/index.html` has been touched. Run every script with `python3 -I` from `art/companion-48/`.

## Where things are

- `palette/`: the 48 colours (identical to the Companion page's `PALETTE`), the shade (DARK/LIGHT), dither and mix tables, signed. `tools/pal.py` loads it and adds the ramps and, since round 2, a **storm table** (`P.storm`: every colour mixed 30 % toward river, nearest palette colour; sand, clay, paper, bone and white kept; a blue cast without a DARK step).
- `review-place/`: the one place of round 1 and 2 (meadow and pond edge in a storm). `work/` holds every piece as one PNG; `sheets/` the six indexed sheets with JSON atlases (indices 0–47, 48 transparent; anchor = foot for sprites, top-left for tiles and chrome); `still/` the composed 450×600 stills and the comparison figures; `sources/` the paid sources with sidecars and `budget.json`; `round1/` a frozen copy of round 1's pieces, still and contact sheets for the side-by-side; `contact-sheet-1x.png` and `-3x.png`.
- `review-place/README.md`: the round's write-up with the filled sign-off checklist (§2 Painted master, art director's column). Update it in place: what is true now, no history.

## The owner's five notes on round 1, and where each stands

1. **Too dark, rain too heavy.** Addressed in the still: the ground and props go through the storm table instead of DARK (`compose-still.py --light storm`, the candidate; `--light plain` is the no-table alternative kept beside it; `--light dark` reproduces round 1). The rain tile has 10 streaks per 96 px instead of 26 (`build-weather.py`). Pawn and mibis never pass through a table. Open: the tree's canopy goes teal under the storm table; the art director should decide whether the G ramp keeps its greens (override in `pal.py` like sand) or the blue cast stands.
2. **The grid is not seamless.** Addressed for the meadow set by a real Aseprite pass on the VM (`tools/aseprite-meadow.lua`, see below): every meadow tile (grass ×4, tall ×2, flowers ×2) takes the same outer band, the master tile's interior offset by half a tile, blended over 8 px and snapped to the tile's colours, so any meadow tile joins any other; each tile is laid 3×3 for the check (`work/meadow-aseprite/*-3x3.png`, `work/preview-meadow-aseprite-2x.png`). The Aseprite output replaced the tiles in `work/ground/`. Open: grass3 and grass4 still show a faint horizontal structure in their own 3×3; a wider band (10) or a second master for them is the next try. The Retro Diffusion Wang tileset (trial C4) was not tried: that style stops at 32 px and ignored the palette in the trial, so it does not meet the 48 px rule.
3. **Pawn, trees, stones dark.** Partly addressed: the painted values are lifted 18 % before quantising (`LIFT` in `build-props.py` and `build-pawn.py`) and nothing in the still darkens them beyond the storm cast. The Retro Diffusion candidates (below) are the other half; not yet picked per piece.
4. **River borders too wavy.** Addressed: the shoreline's amplitude in `build-shore.py` is 0.9 + 0.5 px (was 2.2 + 1.3); the foam line stays; a shallows band (sky over river) now lies between the bank and the water.
5. **Water flat.** Addressed with a scripted candidate, not yet judged by the owner: `build-water.py` draws water1/water2 (river base, short sky crest dashes with ice glints, sparse sea trough lines, a rare pool of sea, drifting between the frames), deep1/deep2 one step down the ramp, and shallows. The still draws the deep water with a wavy edge over the water tiles (in `compose-still.py`), not as a tile boundary. The painted water, deep, reeds and stepping-stone tiles of round 1 are kept only in `round1/work/ground/`; the stepping stone and the reeds are now props placed over water. Two Retro Diffusion water tiles (`sources/rd/C48-R-r2-water1`, `-water2`) came back on-palette but stylised (ring ripples in teal; dark blue with diamonds); kept as labelled candidates, not used.

## Retro Diffusion sprite candidates (half done)

`tools/rd-sprites.py` crops each painted prop (and the pawn's walk2 in four facings) from the Pro sources, puts it on white, and sends it as `input_image` (strength 0.5) to `rd_pro__topdown` with the 48-colour `input_palette` and `remove_bg`, at the piece's own size, one call per piece, $0.18 each. Twelve calls were started (tree, bush, bush-fruit, stone, stone-warm1, stone-charged1, outpost-lit, pod, pawn down/up/left/right); results land in `sources/rd-sprites/C48-S-r2-*-rd.png` with sidecars, inputs in `sources/rd-sprites/inputs/`. `tools/rd-snap.py SRC_DIR OUT_PROPS OUT_PAWN` quantises each result onto the piece's ramps, despeckles, applies the outline rule and places it (pawn at foot y 46 in 48×48) into `work/props-rd/` and `work/pawn-rd/`. **Not done:** the art director's pick per piece (the brief asks for the RD candidate beside the scripted down-render on the contact sheet, the pick going into the sheets), and the handling of the inputs' magenta fringe (the keyed shadow leaves a purple halo on the white input; clean the input's alpha edge or key tighter before the next batch). What the first results show: RD keeps the form, draws crisp leaf and stone texture, and comes back darker and cooler than the painting with a purple ground shadow; the bush is the strongest, the tree the darkest.

What worked and what did not with Retro Diffusion in this folder: `rd_pro__topdown` with `input_palette` returns on-palette pixels (0 off-palette after the snap) for tiles and img2img sprites; a text-only rain prompt gives a side-view scene (rejected), and with `remove_bg` gives streaks in the wrong colours (rejected); the service's `seam_tiling` edit tool has no `check_cost` (the field is refused) and was not run; `rd_tile__tileset` does not reach 48 px. Every call goes through `tools/rd-gen.py` (dry run with `check_cost` first; `--run` to pay; `--input IMG --strength S` for img2img; `--ref IMG` for an RD Pro reference; `--remove-bg`; `--seed N`), which writes the raw PNG and a sidecar without key material. The key is `RETRO_DIFFUSION_API_KEY` in the environment; never print or store it.

## Pipeline per group

| Group | Source | Script | Notes |
| --- | --- | --- | --- |
| Ground: grass ×4, tall ×2, flowers ×2, shade, sand, wet shore | Pro-painted 4×4 grid `sources/C48-T-r1-a1` | `build-ground.py SRC work/ground` (cut by magenta margins, 10 % trim, wrap-blend, level-match across the meadow set, BOX to 48, quantise per ramps, despeckle) then `aseprite-meadow.lua` on the VM for the meadow set | the Aseprite output overwrote `work/ground/` for the eight meadow tiles |
| Water ×2, deep ×2, shallows | scripted | `build-water.py work/ground` | round 2 candidate |
| Shore corner set 16 × 2 | cut from grass1, sand, shallows, water | `build-shore.py work/ground work/shore` | mask bits N=1 E=2 S=4 W=8, water on that side |
| Props | Pro-painted sheet on magenta `sources/C48-P-r1-a1` | `build-props.py SRC work/props` (key, fit, LIFT 1.18, quantise per ramps, despeckle, outline) | RD candidates beside, above |
| Warned strike ×2, HUD icons, key caps, condition bolts, 9-slices | scripted | `build-ui.py work/ui work/props` | from the page's icon forms |
| Pawn 4 facings × walk 3, creep 3, react | Pro-painted 8×4 sheet `sources/C48-W-r1-a1` | `build-pawn.py SRC work/pawn` (hue key, projection cells, fit 40 tall, LIFT, quantise OWNY, outline, foot y 46; up derived from down) | RD candidates for walk2 beside, above |
| Tokens: Pip as Loika idle 2, walk 3; placeholders S02–S04 | the accepted Pip painting `art/miniature-lives/assets/hibit-plain-280x300.png` | `build-tokens.py` | Loika is Pip wherever it appears |
| Rain tile 96, 2 leans × 2 frames | scripted | `build-weather.py work/weather` | RD stages rejected, kept in `sources/rd/` |
| Sheets and atlases | the pieces | `pack.py NAME tile\|sprite\|chrome sheets PIECES...` (see the six calls in the README) | |
| Contact sheets | the pieces | `contact.py OUT SCALE "Group=work/dir=round1/work/dir" ...` (a changed piece shows r1 beside r2) | |
| The still | the pieces | `compose-still.py work OUT.png --light storm` then `beside.py OUT still LABEL [PREV LABEL]` | |

## Checks, and how to run them

- `python3 -I tools/check.py review-place/sheets/*.png review-place/still/*.png --fourgray DIR`: 0 off-palette and 0 semi-transparent pixels on every sheet and still (exit 1 otherwise), with a four-grey rendering of each for the value check. The value fail of round 1 (the pawn's orange and the darkened grass landing in one grey) should be re-read on the round 2 still.
- Tiling check: `work/meadow-aseprite/*-3x3.png` at 1× and `work/preview-meadow-aseprite-2x.png`.
- `python3 -I tools/preview.py OUT SCALE PIECES...` for a quick labelled grid of any pieces.

## The VM and Aseprite

Aseprite 1.3.18 runs headless on the operations VM, not in the session container. The wrapper `mb-vm` runs one command there over SSH; files go over with the same wrapper:

```
tar -C review-place/work/ground -cf - grass1.png grass2.png | mb-vm 'mkdir -p ~/c48/in ~/c48/out && tar -C ~/c48/in -xf -'
mb-vm 'cat > ~/c48/aseprite-meadow.lua' < tools/aseprite-meadow.lua
mb-vm 'cd ~/c48 && aseprite -b --script-param master=grass1 --script-param tiles=grass1,grass2 --script-param band=8 --script-param indir=in --script-param outdir=out --script aseprite-meadow.lua'
mb-vm 'cd ~/c48/out && tar -cf - *.png' > out.tar && tar -C work/meadow-aseprite -xf out.tar
```

Keep the script's own output and the tar stream in separate calls (a `tail` on the same command corrupts the archive). Script parameters arrive in Lua as `app.params`. PNGs round-trip as RGBA with the exact palette colours; the snap to the palette is done inside the script (nearest of the colours the tile and the master already use, weighted 3/4/2).

## Spend so far

`review-place/sources/budget.json` (`python3 -I tools/budget.py review-place/sources` re-sums every sidecar). Round 1: three Pro 1K sources $0.53 and two Retro Diffusion rain stages $0.36. Round 2: two Retro Diffusion water tiles $0.36 and the sprite batch at $0.18 per returned image (twelve started). Retro Diffusion balance before the sprite batch: $6.36.

## What is left for round 2

1. Collect the sprite batch, run `rd-snap.py`, pick per piece, put the picks in `work/props/` and `work/pawn/` (keep the scripted versions in `round1/`), add the candidates group to the contact sheets.
2. Decide the tree's colour under the storm table; re-read the four-grey still.
3. Repack, contact sheets at 1× and 3× with round 1 beside, the still beside the concept and the round 1 still, checks, the README in place with the §2 checklist filled and failures listed, the budget; small commits on main; report to the programme lead with the pipeline table above, never to the owner.
